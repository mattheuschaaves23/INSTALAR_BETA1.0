const RELEASE_API_URL = 'https://api.github.com/repos/mattheuschaaves23/Instalar/releases/latest';
const DOWNLOAD_PATH_PREFIX = '/mattheuschaaves23/Instalar/releases/';
const APK_FILE_NAME = 'InstalaPro-Instaladores.apk';
const CHECKSUM_FILE_NAME = `${APK_FILE_NAME}.sha256`;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedRelease = null;
let cachedUntil = 0;
let pendingReleaseRequest = null;

function isTrustedDownloadUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      url.pathname.startsWith(DOWNLOAD_PATH_PREFIX)
    );
  } catch (_error) {
    return false;
  }
}

function normalizeRelease(payload) {
  const tagName = String(payload?.tag_name || '').trim();
  const versionMatch = tagName.match(/^android-v(\d+\.\d+\.\d+)$/);

  if (!versionMatch || payload?.draft || payload?.prerelease) {
    throw new Error('A versão publicada do aplicativo é inválida.');
  }

  const assets = Array.isArray(payload?.assets) ? payload.assets : [];
  const apkAsset = assets.find((asset) => asset?.name === APK_FILE_NAME);
  const checksumAsset = assets.find((asset) => asset?.name === CHECKSUM_FILE_NAME);

  if (!apkAsset || !isTrustedDownloadUrl(apkAsset.browser_download_url)) {
    throw new Error('O APK da versão mais recente não foi encontrado.');
  }

  return {
    version: versionMatch[1],
    tagName,
    publishedAt: payload?.published_at || null,
    downloadUrl: apkAsset.browser_download_url,
    checksumUrl: isTrustedDownloadUrl(checksumAsset?.browser_download_url)
      ? checksumAsset.browser_download_url
      : null,
    size: Number(apkAsset.size || 0),
  };
}

async function requestLatestRelease() {
  const response = await fetch(RELEASE_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'InstalaPro-Backend',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`GitHub respondeu com status ${response.status}.`);
  }

  return normalizeRelease(await response.json());
}

async function getLatestRelease() {
  if (cachedRelease && Date.now() < cachedUntil) {
    return cachedRelease;
  }

  if (!pendingReleaseRequest) {
    pendingReleaseRequest = requestLatestRelease()
      .then((release) => {
        cachedRelease = release;
        cachedUntil = Date.now() + CACHE_TTL_MS;
        return release;
      })
      .finally(() => {
        pendingReleaseRequest = null;
      });
  }

  return pendingReleaseRequest;
}

exports.getInstallerAppRelease = async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');

  try {
    return res.json(await getLatestRelease());
  } catch (error) {
    if (cachedRelease) {
      return res.json({ ...cachedRelease, stale: true });
    }

    console.error('Erro ao consultar versão do aplicativo:', error.message);
    return res.status(503).json({
      error: 'Não foi possível verificar atualizações do aplicativo agora.',
      code: 'APP_UPDATE_UNAVAILABLE',
    });
  }
};

exports.normalizeRelease = normalizeRelease;
exports.isTrustedDownloadUrl = isTrustedDownloadUrl;
