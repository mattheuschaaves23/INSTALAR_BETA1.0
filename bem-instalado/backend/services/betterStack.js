function getHeartbeatUrl() {
  const value = String(process.env.BETTERSTACK_HEARTBEAT_URL || '').trim();
  if (!value) return '';

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? value : '';
  } catch (_error) {
    return '';
  }
}

async function sendOperationsHeartbeat() {
  const url = getHeartbeatUrl();
  if (!url) return { sent: false, reason: 'betterstack_not_configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    return { sent: response.ok, reason: response.ok ? undefined : `http_${response.status}` };
  } catch (_error) {
    return { sent: false, reason: 'heartbeat_request_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getHeartbeatUrl, sendOperationsHeartbeat };
