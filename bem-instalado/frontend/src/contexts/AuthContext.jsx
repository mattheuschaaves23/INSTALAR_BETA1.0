import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getProfileRequest, loginRequest, logoutRequest, registerClientRequest, registerRequest } from '../services/auth';
import { clearAuthToken, hydrateAuthToken, setAuthToken } from '../utils/safeStorage';
import { registerNativePushNotifications, resetNativePushRegistration } from '../services/pushNotifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setAuthError('');

    try {
      const profile = await getProfileRequest();
      setUser(profile);
      return profile;
    } catch (error) {
      const status = error.response?.status;
      const code = error.response?.data?.code || '';

      if (status === 401 && code.startsWith('AUTH_')) {
        void clearAuthToken();
        setUser(null);
      } else {
        setAuthError(
          error.response?.data?.error ||
            'Não foi possível validar sua sessão. Verifique a conexão e tente novamente.'
        );
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        await hydrateAuthToken();

        if (!active) {
          return;
        }

        await loadProfile();
      } catch (_error) {
        if (!active) {
          return;
        }

        setUser(null);
        setAuthError('Não foi possível abrir sua sessão. Verifique a conexão e tente novamente.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, [loadProfile]);

  useEffect(() => {
    if (user) {
      void registerNativePushNotifications();
    }
  }, [user]);

  const login = async (payload, { remember = true } = {}) => {
    const result = await loginRequest({ ...payload, remember });
    await setAuthToken(result.token, remember);
    setUser(result.user);
    setAuthError('');
    return result;
  };

  const register = async (payload) => {
    const result = await registerRequest(payload);
    await setAuthToken(result.token, true);
    setUser(result.user);
    setAuthError('');
    return result;
  };

  const registerClient = async (payload) => {
    const result = await registerClientRequest(payload);
    await setAuthToken(result.token, true);
    setUser(result.user);
    setAuthError('');
    return result;
  };

  const logout = async () => {
    await logoutRequest().catch(() => null);
    await clearAuthToken();
    resetNativePushRegistration();
    setUser(null);
    setAuthError('');
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, authError, retryProfile: loadProfile, login, register, registerClient, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
