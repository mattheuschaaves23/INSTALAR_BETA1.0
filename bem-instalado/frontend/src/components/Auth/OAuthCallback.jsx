import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getProfileRequest } from '../../services/auth';
import { clearAuthToken, setAuthToken } from '../../utils/safeStorage';
import { getOAuthErrorMessage } from '../../utils/oauthMessages';

const IS_INSTALLER_APP = process.env.REACT_APP_INSTALLER_APP === 'true';

function readCallbackParams() {
  const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const params = new URLSearchParams(rawHash || window.location.search);

  return {
    token: params.get('token') || '',
    next: params.get('next') || '/dashboard',
    oauthError: params.get('oauth_error') || '',
  };
}

function sanitizeNextPath(value) {
  const nextPath = String(value || '').trim();
  return nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';
}

function getAccountHomePath(profile) {
  return profile?.account_type === 'client' ? '/cliente' : '/dashboard';
}

function resolveNextPath(next, profile) {
  const fallback = getAccountHomePath(profile);
  const nextPath = sanitizeNextPath(next);

  if (profile?.account_type === 'client') {
    return nextPath === '/cliente' || nextPath.startsWith('/installers/') ? nextPath : fallback;
  }

  return nextPath;
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function finishLogin() {
      const { token, next, oauthError } = readCallbackParams();

      if (oauthError) {
        setError(getOAuthErrorMessage(oauthError));
        return;
      }

      try {
        if (token) {
          await setAuthToken(token, true);
        }
        const profile = await getProfileRequest();

        if (!isMounted) {
          return;
        }

        if (
          IS_INSTALLER_APP
          && profile?.account_type !== 'installer'
          && !profile?.is_admin
        ) {
          clearAuthToken();
          setError('Este aplicativo aceita somente contas de instalador.');
          return;
        }

        setUser(profile);
        toast.success('Login realizado.');
        navigate(resolveNextPath(next, profile), { replace: true });
      } catch (_error) {
        clearAuthToken();

        if (isMounted) {
          setError('Não foi possível concluir o login social.');
        }
      }
    }

    finishLogin();

    return () => {
      isMounted = false;
    };
  }, [navigate, setUser]);

  return (
    <main className="oauth-callback-page">
      <section className="oauth-callback-card">
        <h1>{error ? 'Falha no acesso' : 'Concluindo acesso...'}</h1>
        <p>
          {error || 'Estamos validando sua conta e preparando o redirecionamento.'}
        </p>
        {error ? (
          <Link to="/instalador/entrar">Voltar para o login</Link>
        ) : null}
      </section>
    </main>
  );
}
