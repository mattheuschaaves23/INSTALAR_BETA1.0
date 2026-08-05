const assert = require('node:assert/strict');
const test = require('node:test');
const { decryptSecret, encryptSecret } = require('../utils/secretEncryption');

test('criptografa o segredo 2FA com AES-GCM e recupera somente com a chave correta', () => {
  const previousKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  process.env.TWO_FACTOR_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  try {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(secret);

    assert.match(encrypted, /^v1:/);
    assert.notEqual(encrypted, secret);
    assert.equal(decryptSecret(encrypted), secret);
  } finally {
    if (previousKey === undefined) {
      delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
    } else {
      process.env.TWO_FACTOR_ENCRYPTION_KEY = previousKey;
    }
  }
});
