const EMAIL_VALUE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const PHONE_VALUE = /\+?\d[\d\s().-]{7,}\d/g;
const SECRET_VALUE = /(?:bearer\s+)?[a-z0-9._-]{24,}/gi;

function clean(value, maxLength = 1800) {
  return String(value || '')
    .replace(EMAIL_VALUE, '[email]')
    .replace(PHONE_VALUE, '[telefone]')
    .replace(SECRET_VALUE, '[segredo]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getConfig() {
  const dsn = String(process.env.REACT_APP_SENTRY_DSN || '').trim();
  if (!dsn) return null;

  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.split('/').filter(Boolean).pop();
    const publicKey = decodeURIComponent(parsed.username || '');
    if (!projectId || !publicKey || !/^https?:$/.test(parsed.protocol)) return null;

    return {
      dsn,
      endpoint: `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/?sentry_key=${encodeURIComponent(publicKey)}&sentry_version=7`,
    };
  } catch (_error) {
    return null;
  }
}

export function isSentryEnabled() {
  return Boolean(getConfig());
}

function eventPayload(error, context = {}) {
  const eventId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().replaceAll('-', '')
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const message = clean(error?.message || error || 'Erro inesperado', 1200);
  const stack = clean(error?.stack || context.stack || '', 7000);
  const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
  const event = {
    event_id: eventId,
    level: context.level || 'error',
    logger: 'instalapro.frontend',
    message,
    platform: 'javascript',
    release: clean(process.env.REACT_APP_RELEASE || '', 80) || undefined,
    environment: process.env.NODE_ENV || 'development',
    tags: { source: clean(context.source || 'frontend', 40), route: pathname || undefined },
    exception: {
      values: [{ type: error?.name || 'Error', value: message, stacktrace: stack ? { frames: [{ filename: pathname || 'frontend', function: 'application', context_line: stack }] } : undefined }],
    },
  };
  return `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: 'event', content_type: 'application/json' })}\n${JSON.stringify(event)}`;
}

export function captureFrontendException(error, context = {}) {
  const config = getConfig();
  if (!config || typeof window === 'undefined') return;

  fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: eventPayload(error, context),
    keepalive: true,
  }).catch(() => null);
}

export function initializeSentry() {
  if (!isSentryEnabled() || typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    captureFrontendException(event.error || event.message, { source: 'window.error' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    captureFrontendException(event.reason || 'Promessa rejeitada sem tratamento', { source: 'window.unhandledrejection' });
  });
}
