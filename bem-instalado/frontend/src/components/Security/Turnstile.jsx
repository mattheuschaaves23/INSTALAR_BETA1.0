import { useEffect, useRef } from 'react';

const SCRIPT_ID = 'cloudflare-turnstile-script';
const SITE_KEY = String(process.env.REACT_APP_TURNSTILE_SITE_KEY || '').trim();

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.onload = () => resolve(window.turnstile);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function isTurnstileEnabled() {
  return Boolean(SITE_KEY);
}

export default function Turnstile({ action, onExpire, onVerify, resetKey = 0 }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const callbacksRef = useRef({ onExpire, onVerify });

  useEffect(() => {
    callbacksRef.current = { onExpire, onVerify };
  }, [onExpire, onVerify]);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return undefined;
    let active = true;

    loadTurnstileScript()
      .then((turnstile) => {
        if (!active || !turnstile || widgetIdRef.current !== null) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          action,
          callback: (token) => callbacksRef.current.onVerify?.(token),
          'error-callback': () => callbacksRef.current.onExpire?.(),
          'expired-callback': () => callbacksRef.current.onExpire?.(),
          sitekey: SITE_KEY,
          theme: 'auto',
        });
      })
      .catch(() => callbacksRef.current.onExpire?.());

    return () => {
      active = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action]);

  useEffect(() => {
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div aria-label="Verificação de segurança" className="turnstile-challenge" ref={containerRef} />;
}
