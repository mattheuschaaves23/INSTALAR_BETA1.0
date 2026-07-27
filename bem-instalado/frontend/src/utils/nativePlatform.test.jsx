import { describe, expect, it } from 'vitest';
import { resolveNativeStorePlatform } from './nativePlatform';

describe('plataforma nativa das lojas', () => {
  it('identifica Android e iOS somente no aplicativo de instaladores', () => {
    expect(resolveNativeStorePlatform({
      isInstallerApp: true,
      isNativePlatform: true,
      platform: 'android',
    })).toBe('android');
    expect(resolveNativeStorePlatform({
      isInstallerApp: true,
      isNativePlatform: true,
      platform: 'ios',
    })).toBe('ios');
  });

  it('trata navegador e plataformas desconhecidas como web', () => {
    expect(resolveNativeStorePlatform({
      isInstallerApp: false,
      isNativePlatform: true,
      platform: 'android',
    })).toBe('web');
    expect(resolveNativeStorePlatform({
      isInstallerApp: true,
      isNativePlatform: false,
      platform: 'ios',
    })).toBe('web');
    expect(resolveNativeStorePlatform({
      isInstallerApp: true,
      isNativePlatform: true,
      platform: 'web',
    })).toBe('web');
  });
});
