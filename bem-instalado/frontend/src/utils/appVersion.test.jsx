import { describe, expect, it } from 'vitest';
import { compareAppVersions, normalizeInstallerRelease } from './appVersion';

describe('atualizações do aplicativo Android', () => {
  it('compara versões sem confundir números de dois dígitos', () => {
    expect(compareAppVersions('1.0.6', '1.0.5')).toBe(1);
    expect(compareAppVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareAppVersions('2.0.0', '2.0.0')).toBe(0);
    expect(compareAppVersions('1.0.5', '1.0.6')).toBe(-1);
  });

  it('aceita somente o APK publicado no repositório oficial', () => {
    expect(
      normalizeInstallerRelease({
        version: '1.0.6',
        tagName: 'android-v1.0.6',
        downloadUrl:
          'https://github.com/mattheuschaaves23/Instalar/releases/download/android-v1.0.6/InstalaPro-Instaladores.apk',
        size: 33_000_000,
      })
    ).toMatchObject({
      version: '1.0.6',
      tagName: 'android-v1.0.6',
      size: 33_000_000,
    });

    expect(() =>
      normalizeInstallerRelease({
        version: '1.0.6',
        downloadUrl: 'https://example.com/app.apk',
      })
    ).toThrow(/confiável/);
  });
});
