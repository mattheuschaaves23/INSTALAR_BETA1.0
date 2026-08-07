import api from './api';

function vapidPublicKey() {
  return String(process.env.REACT_APP_WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();
}

function toUint8Array(value) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function getWebPushSupport() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'unsupported' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, reason: 'unsupported' };
  }
  if (!vapidPublicKey()) return { supported: false, reason: 'not_configured' };
  return { supported: true, permission: Notification.permission };
}

export async function registerWebPushNotifications() {
  const support = getWebPushSupport();
  if (!support.supported) return support;

  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') return { supported: true, permission, enabled: false };

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(vapidPublicKey()),
    });
  }

  await api.post('/notifications/devices', { platform: 'web', token: JSON.stringify(subscription) });
  return { supported: true, permission, enabled: true };
}
