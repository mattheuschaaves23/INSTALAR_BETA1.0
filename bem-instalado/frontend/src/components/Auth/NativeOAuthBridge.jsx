import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router';
import { getNativeOAuthRoute } from '../../utils/nativeOAuth';

export default function NativeOAuthBridge() {
  const navigate = useNavigate();
  const lastHandledUrl = useRef('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    let disposed = false;
    let listenerHandle;

    const handleUrl = async ({ url } = {}) => {
      const route = getNativeOAuthRoute(url);

      if (!route || lastHandledUrl.current === url) {
        return;
      }

      lastHandledUrl.current = url;
      await Browser.close().catch(() => null);

      if (!disposed) {
        navigate(route, { replace: true });
      }
    };

    CapacitorApp.addListener('appUrlOpen', handleUrl).then((handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }

      listenerHandle = handle;
    });

    CapacitorApp.getLaunchUrl()
      .then((launch) => handleUrl(launch))
      .catch(() => null);

    return () => {
      disposed = true;
      void listenerHandle?.remove();
    };
  }, [navigate]);

  return null;
}
