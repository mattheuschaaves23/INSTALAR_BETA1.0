import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import api from './api';
import { compareAppVersions, normalizeInstallerRelease } from '../utils/appVersion';

const IS_INSTALLER_APP = process.env.REACT_APP_INSTALLER_APP === 'true';
const NativeAppUpdater = registerPlugin('NativeAppUpdater');

export function isNativeInstallerApp() {
  return IS_INSTALLER_APP && Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
}

export async function checkForInstallerAppUpdate() {
  if (!isNativeInstallerApp()) {
    return null;
  }

  const [appInfo, response] = await Promise.all([
    CapacitorApp.getInfo(),
    api.get('/public/installer-app-release'),
  ]);
  const release = normalizeInstallerRelease(response.data);
  const currentVersion = String(appInfo.version || '0.0.0');

  return {
    ...release,
    available: compareAppVersions(release.version, currentVersion) > 0,
    currentVersion,
    currentBuild: String(appInfo.build || ''),
  };
}

export async function getInstallerUpdatePermission() {
  return NativeAppUpdater.getInstallPermission();
}

export async function openInstallerUpdatePermission() {
  return NativeAppUpdater.openInstallPermissionSettings();
}

export async function downloadAndInstallInstallerUpdate(downloadUrl) {
  return NativeAppUpdater.downloadAndInstall({ url: downloadUrl });
}

export function listenToInstallerUpdateProgress(listener) {
  return NativeAppUpdater.addListener('downloadProgress', listener);
}
