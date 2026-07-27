import { Capacitor } from '@capacitor/core';

const IS_INSTALLER_APP = process.env.REACT_APP_INSTALLER_APP === 'true';

export function resolveNativeStorePlatform({ isInstallerApp, isNativePlatform, platform }) {
  if (!isInstallerApp || !isNativePlatform) {
    return 'web';
  }

  return platform === 'android' || platform === 'ios' ? platform : 'web';
}

export function getNativeStorePlatform() {
  return resolveNativeStorePlatform({
    isInstallerApp: IS_INSTALLER_APP,
    isNativePlatform: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  });
}

export function isNativeStoreApp() {
  return getNativeStorePlatform() !== 'web';
}

export function isIosInstallerApp() {
  return getNativeStorePlatform() === 'ios';
}
