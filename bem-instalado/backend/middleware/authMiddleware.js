const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const pool = require('../config/database');

function normalizeAccountType(value) {
  return String(value || '').trim().toLowerCase() === 'client' ? 'client' : 'installer';
}

function readSessionCookie(req) {
  const raw = String(req.headers.cookie || '');
  const entry = raw.split(';').map((item) => item.trim()).find((item) => item.startsWith('instalapro_session='));
  if (!entry) return '';
  try {
    return decodeURIComponent(entry.slice('instalapro_session='.length));
  } catch (_error) {
    return '';
  }
}

module.exports = async (req, res, next) => {
  const header = String(req.headers.authorization || '').trim();
  const cookieToken = readSessionCookie(req);

  if (!header && !cookieToken) {
    return res.status(401).json({ error: 'Token não informado.', code: 'AUTH_TOKEN_MISSING' });
  }

  const [scheme, bearerToken] = header.split(' ');
  if (header && (!/^Bearer$/i.test(scheme) || !bearerToken)) {
    return res.status(401).json({ error: 'Token mal formatado.', code: 'AUTH_TOKEN_MALFORMED' });
  }
  const token = bearerToken || cookieToken;

  let decoded;

  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (_error) {
    return res.status(401).json({ error: 'Token inválido.', code: 'AUTH_TOKEN_INVALID' });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT id, account_type, is_admin, auth_version, email_verified_at
        FROM users
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1
      `,
      [decoded.id]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado.', code: 'AUTH_USER_NOT_FOUND' });
    }

    if (Number(decoded.v ?? 0) !== Number(user.auth_version ?? 0)) {
      return res.status(401).json({ error: 'Sessão expirada.', code: 'AUTH_SESSION_REVOKED' });
    }

    req.userId = user.id;
    req.user = {
      id: user.id,
      account_type: normalizeAccountType(user.account_type),
      is_admin: Boolean(user.is_admin),
      email_verified: Boolean(user.email_verified_at),
    };

    return next();
  } catch (_error) {
    return res.status(503).json({
      error: 'Não foi possível validar sua sessão agora. Tente novamente.',
      code: 'AUTH_SERVICE_UNAVAILABLE',
    });
  }
};
