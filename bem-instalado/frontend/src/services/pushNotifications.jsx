import { Capacitor } from '@capacitor/core';
import api from './api';

let registrationStarted = false;

function platformName() {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : '';
}

export async function registerNativePushNotifications() {
  if (registrationStarted || !Capacitor.isNativePlatform()) return;
  const platform = platformName();
  if (!platform) return;
  registrationStarted = true;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return;

    await PushNotifications.addListener('registration', async (token) => {
      await api.post('/notifications/devices', { platform, token: token.value }).catch(() => null);
    });
    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('Registro de push indisponível:', error.error || error);
    });
    await PushNotifications.register();
  } catch (error) {
    console.warn('Push nativo indisponível:', error.message || error);
  }
}

export function resetNativePushRegistration() {
  registrationStarted = false;
}
