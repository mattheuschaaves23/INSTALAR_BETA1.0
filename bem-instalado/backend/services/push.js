const pool = require('../config/database');

function firebaseConfig() {
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.project_id && parsed.client_email && parsed.private_key ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function getMessaging() {
  const serviceAccount = firebaseConfig();
  if (!serviceAccount) return null;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin.messaging();
  } catch (error) {
    console.error('Push não inicializado:', error.message);
    return null;
  }
}

function isPushConfigured() {
  return Boolean(firebaseConfig());
}

async function registerDevice({ userId, platform, token }) {
  const normalizedPlatform = ['android', 'ios', 'web'].includes(String(platform || '').toLowerCase())
    ? String(platform).toLowerCase()
    : '';
  const normalizedToken = String(token || '').trim().slice(0, 4096);
  if (!normalizedPlatform || normalizedToken.length < 20) {
    const error = new Error('Dispositivo de notificação inválido.');
    error.code = 'INVALID_PUSH_DEVICE';
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO notification_devices (user_id, platform, token, active, last_seen_at, updated_at)
     VALUES ($1, $2, $3, TRUE, NOW(), NOW())
     ON CONFLICT (token) DO UPDATE
     SET user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         active = TRUE,
         last_seen_at = NOW(),
         updated_at = NOW()
     RETURNING id, platform, last_seen_at`,
    [userId, normalizedPlatform, normalizedToken]
  );
  return result.rows[0];
}

async function unregisterDevice({ userId, deviceId }) {
  const result = await pool.query(
    `UPDATE notification_devices SET active = FALSE, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [deviceId, userId]
  );
  return result.rowCount > 0;
}

async function sendPushToUser({ userId, title, body, data = {} }) {
  const messaging = getMessaging();
  if (!messaging || !userId) return { sent: 0, reason: isPushConfigured() ? 'firebase_unavailable' : 'not_configured' };

  const devices = await pool.query(
    `SELECT id, token FROM notification_devices WHERE user_id = $1 AND active = TRUE`,
    [userId]
  );
  const tokens = devices.rows.map((device) => device.token);
  if (!tokens.length) return { sent: 0, reason: 'no_devices' };

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: String(title || 'InstalaPro'), body: String(body || '') },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
    android: { priority: 'high', notification: { channelId: 'instalapro_alerts' } },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  const invalidTokenIndexes = [];
  response.responses.forEach((item, index) => {
    const code = item.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
      invalidTokenIndexes.push(index);
    }
  });
  if (invalidTokenIndexes.length) {
    await pool.query(
      `UPDATE notification_devices SET active = FALSE, updated_at = NOW()
       WHERE id = ANY($1::int[])`,
      [invalidTokenIndexes.map((index) => devices.rows[index].id)]
    );
  }
  return { sent: response.successCount, failed: response.failureCount };
}

module.exports = {
  isPushConfigured,
  registerDevice,
  sendPushToUser,
  unregisterDevice,
};
