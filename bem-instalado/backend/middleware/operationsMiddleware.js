const crypto = require('crypto');

function suppliedToken(req) {
  const authorization = String(req.get('authorization') || '');
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  return String(req.get('x-operations-token') || bearer || '').trim();
}

function hasExpectedToken(received, expected) {
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function hasOperationsAccess(req) {
  const received = suppliedToken(req);
  const acceptedTokens = [process.env.OPERATIONS_TOKEN, process.env.CRON_SECRET]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return acceptedTokens.some((expected) => hasExpectedToken(received, expected));
}

function requireOperationsAccess(req, res, next) {
  if (!hasOperationsAccess(req)) {
    return res.status(401).json({ error: 'Credencial operacional inválida.' });
  }
  return next();
}

module.exports = { hasOperationsAccess, requireOperationsAccess };
