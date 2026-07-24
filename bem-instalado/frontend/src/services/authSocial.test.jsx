import { afterEach, describe, expect, it } from 'vitest';

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
});

describe('login social do aplicativo', () => {
  it('inicia o Google como instalador e solicita retorno ao Android', async () => {
    globalThis.window = {
      location: {
        hostname: 'localhost',
        origin: 'https://localhost',
        pathname: '/instalador/entrar',
        port: '',
        protocol: 'https:',
      },
    };

    const { buildSocialLoginUrl } = await import('./auth');
    const url = new URL(buildSocialLoginUrl('google', {
      role: 'installer',
      next: '/dashboard',
      platform: 'android',
    }));

    expect(url.pathname).toBe('/api/auth/oauth/google');
    expect(url.searchParams.get('role')).toBe('installer');
    expect(url.searchParams.get('next')).toBe('/dashboard');
    expect(url.searchParams.get('platform')).toBe('android');
  });
});
