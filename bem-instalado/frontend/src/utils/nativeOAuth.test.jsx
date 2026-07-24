import { describe, expect, it } from 'vitest';
import { buildNativeOAuthFallbackUrl, getNativeOAuthRoute } from './nativeOAuth';

describe('retorno OAuth do aplicativo Android', () => {
  it('aceita o App Link oficial e preserva o fragmento de autenticação', () => {
    const route = getNativeOAuthRoute(
      'https://instalar-sigma.vercel.app/auth/mobile/callback#token=abc&next=%2Fdashboard'
    );

    expect(route).toBe('/auth/social/callback#token=abc&next=%2Fdashboard');
  });

  it('aceita o esquema de contingência do InstalaPro', () => {
    expect(
      getNativeOAuthRoute('instalapro://auth/callback#oauth_error=access_denied')
    ).toBe('/auth/social/callback#oauth_error=access_denied');
  });

  it('rejeita domínios, protocolos e caminhos que não pertencem ao login', () => {
    expect(getNativeOAuthRoute('https://example.com/auth/mobile/callback#token=abc')).toBe('');
    expect(getNativeOAuthRoute('instalapro://profile/callback#token=abc')).toBe('');
    expect(getNativeOAuthRoute('javascript:alert(1)')).toBe('');
  });

  it('cria o retorno de contingência sem mover o token para a query string', () => {
    expect(
      buildNativeOAuthFallbackUrl(
        'https://instalar-sigma.vercel.app/auth/mobile/callback#token=abc&next=%2Fdashboard'
      )
    ).toBe('instalapro://auth/callback#token=abc&next=%2Fdashboard');
  });
});
