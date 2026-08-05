const pool = require('../config/database');
const { isPushConfigured, registerDevice, unregisterDevice } = require('../services/push');

exports.getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT *
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 30
      `,
      [req.userId]
    );

    return res.json(rows);
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao listar notificações.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        UPDATE notifications
        SET read = true
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `,
      [req.params.id, req.userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    return res.json(rows[0]);
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao atualizar notificação.' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const result = await pool.query(
      `
        UPDATE notifications
        SET read = true
        WHERE user_id = $1 AND read = false
      `,
      [req.userId]
    );

    return res.json({ success: true, updated: result.rowCount });
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao atualizar notificações.' });
  }
};

exports.getDeviceCapabilities = (_req, res) => res.json({ push_configured: isPushConfigured() });

exports.registerDevice = async (req, res) => {
  try {
    const device = await registerDevice({
      userId: req.userId,
      platform: req.body?.platform,
      token: req.body?.token,
    });
    return res.status(201).json({ device, push_configured: isPushConfigured() });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Não foi possível registrar este dispositivo.', code: error.code });
  }
};

exports.unregisterDevice = async (req, res) => {
  const deviceId = Number(req.params.id);
  if (!Number.isInteger(deviceId) || deviceId <= 0) return res.status(400).json({ error: 'Dispositivo inválido.' });
  const removed = await unregisterDevice({ userId: req.userId, deviceId });
  return res.json({ success: removed });
};
