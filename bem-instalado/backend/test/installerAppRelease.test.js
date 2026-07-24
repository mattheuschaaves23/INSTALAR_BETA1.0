const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isTrustedDownloadUrl,
  normalizeRelease,
} = require('../controllers/installerAppReleaseController');

test('normaliza a versão Android publicada com o APK oficial', () => {
  const release = normalizeRelease({
    tag_name: 'android-v1.0.6',
    published_at: '2026-07-24T20:00:00Z',
    draft: false,
    prerelease: false,
    assets: [
      {
        name: 'InstalaPro-Instaladores.apk',
        size: 33_000_000,
        browser_download_url:
          'https://github.com/mattheuschaaves23/Instalar/releases/download/android-v1.0.6/InstalaPro-Instaladores.apk',
      },
      {
        name: 'InstalaPro-Instaladores.apk.sha256',
        size: 94,
        browser_download_url:
          'https://github.com/mattheuschaaves23/Instalar/releases/download/android-v1.0.6/InstalaPro-Instaladores.apk.sha256',
      },
    ],
  });

  assert.equal(release.version, '1.0.6');
  assert.equal(release.tagName, 'android-v1.0.6');
  assert.equal(release.size, 33_000_000);
  assert.match(release.downloadUrl, /InstalaPro-Instaladores\.apk$/);
  assert.match(release.checksumUrl, /\.sha256$/);
});

test('rejeita versões ou arquivos fora da publicação oficial', () => {
  assert.equal(
    isTrustedDownloadUrl('https://example.com/InstalaPro-Instaladores.apk'),
    false
  );

  assert.throws(
    () =>
      normalizeRelease({
        tag_name: 'v1.0.6',
        assets: [],
      }),
    /versão publicada/
  );

  assert.throws(
    () =>
      normalizeRelease({
        tag_name: 'android-v1.0.6',
        assets: [
          {
            name: 'InstalaPro-Instaladores.apk',
            browser_download_url: 'https://example.com/app.apk',
          },
        ],
      }),
    /APK/
  );
});
