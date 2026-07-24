const INSTALLER_RELEASE_PATH = '/mattheuschaaves23/Instalar/releases/';

function parseVersion(version) {
  const match = String(version || '')
    .trim()
    .replace(/^v/i, '')
    .match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    return null;
  }

  return match.slice(1).map((part) => Number(part));
}

export function compareAppVersions(leftVersion, rightVersion) {
  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);

  if (!left || !right) {
    return 0;
  }

  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return 1;
    if (left[index] < right[index]) return -1;
  }

  return 0;
}

export function normalizeInstallerRelease(payload) {
  const version = String(payload?.version || '').trim();
  const parsedVersion = parseVersion(version);

  if (!parsedVersion) {
    throw new Error('O servidor informou uma versão inválida.');
  }

  let downloadUrl;

  try {
    downloadUrl = new URL(payload?.downloadUrl);
  } catch (_error) {
    throw new Error('O servidor não informou o arquivo da atualização.');
  }

  if (
    downloadUrl.protocol !== 'https:' ||
    downloadUrl.hostname !== 'github.com' ||
    !downloadUrl.pathname.startsWith(INSTALLER_RELEASE_PATH)
  ) {
    throw new Error('O endereço da atualização não é confiável.');
  }

  return {
    version,
    tagName: String(payload?.tagName || ''),
    downloadUrl: downloadUrl.toString(),
    publishedAt: payload?.publishedAt || null,
    size: Math.max(0, Number(payload?.size || 0)),
  };
}
