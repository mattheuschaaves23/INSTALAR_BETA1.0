const storageCache = new Map();
const AUTH_TOKEN_KEY = 'token';
const AUTH_COOKIE_NAME = 'instalapro_auth_token';
const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const NATIVE_STORAGE_TIMEOUT_MS = 2500;
let memoryAuthToken = '';

function resolveWithTimeout(task, fallback, timeoutMs = NATIVE_STORAGE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let finished = false;
    let timeoutId;

    const finish = (value) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeoutId);
      resolve(value);
    };

    timeoutId = setTimeout(() => finish(fallback), timeoutMs);
    Promise.resolve()
      .then(task)
      .then(finish)
      .catch(() => finish(fallback));
  });
}

function getStorage(storageName) {
  if (typeof window === 'undefined') {
    return null;
  }

  if (storageCache.has(storageName)) {
    return storageCache.get(storageName);
  }

  try {
    const storage = window[storageName];
    const testKey = `__instalar_${storageName}_test__`;

    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    storageCache.set(storageName, storage);
    return storage;
  } catch (_error) {
    // Alguns navegadores móveis bloqueiam o armazenamento apenas durante a
    // inicialização. Não memorize a falha: a próxima tentativa pode funcionar.
    storageCache.delete(storageName);
    return null;
  }
}

function readAuthCookie() {
  if (typeof document === 'undefined') {
    return '';
  }

  try {
    const prefix = `${AUTH_COOKIE_NAME}=`;
    const entry = document.cookie
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(prefix));

    return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
  } catch (_error) {
    return '';
  }
}

function writeAuthCookie(token, remember) {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const secure = window.location?.protocol === 'https:' ? '; Secure' : '';
    const lifetime = remember ? `; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}` : '';
    document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}${lifetime}`;
    return readAuthCookie() === token;
  } catch (_error) {
    return false;
  }
}

function removeAuthCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    const secure = window.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; SameSite=Lax${secure}; Max-Age=0`;
  } catch (_error) {
    // A limpeza dos outros armazenamentos continua mesmo se cookies estiverem bloqueados.
  }
}

async function getNativePreferences() {
  if (typeof window === 'undefined') {
    return null;
  }

  return resolveWithTimeout(async () => {
    const [{ Capacitor }, { Preferences }] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor/preferences'),
    ]);

    return Capacitor.isNativePlatform() ? Preferences : null;
  }, null);
}

function createSafeStorage(storageName) {
  return {
    getItem(key) {
      try {
        return getStorage(storageName)?.getItem(key) || null;
      } catch (_error) {
        return null;
      }
    },
    setItem(key, value) {
      try {
        const storage = getStorage(storageName);

        if (!storage) {
          return false;
        }

        storage.setItem(key, value);
        return true;
      } catch (_error) {
        return false;
      }
    },
    removeItem(key) {
      try {
        getStorage(storageName)?.removeItem(key);
        return true;
      } catch (_error) {
        return false;
      }
    },
  };
}

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');

export function getAuthToken() {
  const token =
    memoryAuthToken ||
    safeLocalStorage.getItem(AUTH_TOKEN_KEY) ||
    safeSessionStorage.getItem(AUTH_TOKEN_KEY) ||
    readAuthCookie();

  if (token) {
    memoryAuthToken = token;
  }

  return token || null;
}

export async function hydrateAuthToken() {
  const existingToken = getAuthToken();

  if (existingToken) {
    void getNativePreferences().then((preferences) => {
      if (preferences) {
        void resolveWithTimeout(
          () => preferences.set({ key: AUTH_TOKEN_KEY, value: existingToken }),
          null
        );
      }
    });

    return existingToken;
  }

  const preferences = await getNativePreferences();

  if (!preferences) {
    return null;
  }

  const result = await resolveWithTimeout(
    () => preferences.get({ key: AUTH_TOKEN_KEY }),
    { value: null }
  );
  const nativeToken = String(result?.value || '').trim();

  if (!nativeToken) {
    return null;
  }

  memoryAuthToken = nativeToken;
  safeLocalStorage.setItem(AUTH_TOKEN_KEY, nativeToken);
  writeAuthCookie(nativeToken, true);
  return nativeToken;
}

export async function setAuthToken(token, remember = true) {
  const normalizedToken = String(token || '').trim();
  const targetStorage = remember ? safeLocalStorage : safeSessionStorage;
  const otherStorage = remember ? safeSessionStorage : safeLocalStorage;

  memoryAuthToken = normalizedToken;
  otherStorage.removeItem(AUTH_TOKEN_KEY);
  const storedInBrowser = targetStorage.setItem(AUTH_TOKEN_KEY, normalizedToken);
  const storedInCookie = writeAuthCookie(normalizedToken, remember);
  const preferences = await getNativePreferences();
  let storedNatively = false;

  if (preferences) {
    storedNatively = await resolveWithTimeout(
      () => preferences.set({ key: AUTH_TOKEN_KEY, value: normalizedToken }).then(() => true),
      false
    );
  }

  return Boolean(normalizedToken && (storedInBrowser || storedInCookie || storedNatively || memoryAuthToken));
}

export async function clearAuthToken() {
  memoryAuthToken = '';
  safeLocalStorage.removeItem(AUTH_TOKEN_KEY);
  safeSessionStorage.removeItem(AUTH_TOKEN_KEY);
  removeAuthCookie();

  const preferences = await getNativePreferences();
  if (preferences) {
    await resolveWithTimeout(() => preferences.remove({ key: AUTH_TOKEN_KEY }), null);
  }
}
