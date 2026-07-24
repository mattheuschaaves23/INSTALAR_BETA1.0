const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'auth-capabilities-test-secret-with-32-characters';

const authController = require('../controllers/authController');

test('expõe somente Google como provedor de login social', () => {
  const previousClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  let payload;

  process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'google-client-secret';

  try {
    authController.getCapabilities({}, {
      json(value) {
        payload = value;
        return value;
      },
    });

    assert.deepEqual(payload.oauth, { google: true });
    assert.equal(Object.hasOwn(payload.oauth, 'apple'), false);
  } finally {
    if (previousClientId === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previousClientId;

    if (previousClientSecret === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    else process.env.GOOGLE_OAUTH_CLIENT_SECRET = previousClientSecret;
  }
});

test('preserva o retorno Android no estado OAuth e devolve erros ao aplicativo', async () => {
  const previous = {
    frontendUrl: process.env.FRONTEND_URL,
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  };
  const redirects = [];
  const requestBase = {
    protocol: 'https',
    get(name) {
      if (name === 'host') return 'instalar-sigma.vercel.app';
      return '';
    },
  };
  const response = {
    redirect(value) {
      redirects.push(value);
      return value;
    },
  };

  process.env.FRONTEND_URL = 'https://instalar-sigma.vercel.app';
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'google-client-secret';

  try {
    await authController.startOAuth({
      ...requestBase,
      params: { provider: 'google' },
      query: {
        role: 'installer',
        next: '/dashboard',
        platform: 'android',
      },
    }, response);

    const authorizationUrl = new URL(redirects.at(-1));
    const state = authorizationUrl.searchParams.get('state');
    assert.ok(state);

    await authController.handleOAuthCallback({
      ...requestBase,
      body: {},
      params: { provider: 'google' },
      query: { state, error: 'access_denied' },
    }, response);

    const callbackUrl = new URL(redirects.at(-1));
    assert.equal(callbackUrl.pathname, '/auth/mobile/callback');
    assert.equal(
      new URLSearchParams(callbackUrl.hash.slice(1)).get('oauth_error'),
      'access_denied'
    );
  } finally {
    if (previous.frontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previous.frontendUrl;

    if (previous.clientId === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = previous.clientId;

    if (previous.clientSecret === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    else process.env.GOOGLE_OAUTH_CLIENT_SECRET = previous.clientSecret;
  }
});
