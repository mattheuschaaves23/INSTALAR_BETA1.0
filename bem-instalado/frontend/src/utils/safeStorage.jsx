const storageCache = new Map();
const AUTH_TOKEN_KEY = 'token';
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
  return memoryAuthToken || null;
}

export async function hydrateAuthToken() {
  if (memoryAuthToken) return memoryAuthToken;

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
  return nativeToken;
}

export async function setAuthToken(token, remember = true) {
  const normalizedToken = String(token || '').trim();
  memoryAuthToken = normalizedToken;
  const preferences = await getNativePreferences();
  let storedNatively = false;

  if (preferences && remember) {
    storedNatively = await resolveWithTimeout(
      () => preferences.set({ key: AUTH_TOKEN_KEY, value: normalizedToken }).then(() => true),
      false
    );
  }

  return Boolean(normalizedToken && (storedNatively || memoryAuthToken));
}

export async function clearAuthToken() {
  memoryAuthToken = '';
  safeLocalStorage.removeItem(AUTH_TOKEN_KEY);
  safeSessionStorage.removeItem(AUTH_TOKEN_KEY);

  const preferences = await getNativePreferences();
  if (preferences) {
    await resolveWithTimeout(() => preferences.remove({ key: AUTH_TOKEN_KEY }), null);
  }
}
