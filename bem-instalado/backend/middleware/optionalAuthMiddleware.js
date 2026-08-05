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

module.exports = async (req, _res, next) => {
  const header = String(req.headers.authorization || '').trim();

  if (!header && !readSessionCookie(req)) {
    return next();
  }

  const [scheme, bearerToken] = header.split(' ');

  if (header && (!/^Bearer$/i.test(scheme) || !bearerToken)) {
    return next();
  }
  const token = bearerToken || readSessionCookie(req);

  try {
    const decoded = jwt.verify(token, jwtSecret);
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

    if (user && Number(decoded.v ?? 0) === Number(user.auth_version ?? 0)) {
      req.userId = user.id;
      req.user = {
        id: user.id,
        account_type: normalizeAccountType(user.account_type),
        is_admin: Boolean(user.is_admin),
        email_verified: Boolean(user.email_verified_at),
      };
    }
  } catch (_error) {
    // Rotas publicas continuam anonimas quando um token antigo ou invalido e enviado.
  }

  return next();
};
