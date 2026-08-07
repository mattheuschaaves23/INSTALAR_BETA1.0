const crypto = require('crypto');

function suppliedToken(req) {
  const authorization = String(req.get('authorization') || '');
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  return String(req.get('x-operations-token') || bearer || '').trim();
}

function hasOperationsAccess(req) {
  const expected = String(process.env.OPERATIONS_TOKEN || '').trim();
  const received = suppliedToken(req);
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function requireOperationsAccess(req, res, next) {
  if (!hasOperationsAccess(req)) {
    return res.status(401).json({ error: 'Credencial operacional inválida.' });
  }
  return next();
}

module.exports = { hasOperationsAccess, requireOperationsAccess };
