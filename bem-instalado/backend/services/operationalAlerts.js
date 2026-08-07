const crypto = require('crypto');

const recentAlerts = new Map();
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function isConfigured() {
  return Boolean(String(process.env.ALERT_WEBHOOK_URL || '').trim());
}

function redact(value, maxLength = 600) {
  return String(value || '')
    .replace(/https?:\/\/[^\s]+/gi, '[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

async function notifyOperationalAlert({ severity = 'error', source = 'backend', message, metadata = {} }) {
  const endpoint = String(process.env.ALERT_WEBHOOK_URL || '').trim();
  if (!endpoint) return { sent: false, reason: 'alert_webhook_not_configured' };

  const fingerprint = crypto
    .createHash('sha256')
    .update(`${severity}:${source}:${redact(message, 240)}`)
    .digest('hex');
  const now = Date.now();
  const lastSentAt = recentAlerts.get(fingerprint) || 0;
  if (now - lastSentAt < DEDUPE_WINDOW_MS) return { sent: false, reason: 'deduplicated' };
  recentAlerts.set(fingerprint, now);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const authorization = String(process.env.ALERT_WEBHOOK_AUTHORIZATION || '').trim();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify({
        service: 'InstalaPro',
        severity,
        source,
        message: redact(message),
        occurred_at: new Date().toISOString(),
        metadata,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`alert_webhook_http_${response.status}`);
    }

    return { sent: true };
  } catch (error) {
    recentAlerts.delete(fingerprint);
    console.error('Falha ao enviar alerta operacional:', error.message);
    return { sent: false, reason: 'alert_webhook_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isOperationalAlertConfigured: isConfigured, notifyOperationalAlert };
