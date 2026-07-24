import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import {
  getCachedSubscriptionAccess,
  isSubscriptionAccessCacheFresh,
  validateSubscriptionAccess,
} from './subscriptionAccessCache';
import DecoratingWallLoader from './DecoratingWallLoader';

const BACKGROUND_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default function SubscriptionGate() {
  const location = useLocation();
  const { user } = useAuth();
  const userKey = user?.id || user?.email || '';
  const cachedAccess = getCachedSubscriptionAccess(userKey);
  const [loading, setLoading] = useState(!cachedAccess);
  const [canUseApp, setCanUseApp] = useState(Boolean(cachedAccess?.canUseApp));

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedSubscriptionAccess(userKey);
    const hasCache = Boolean(cached);

    if (cached) {
      setCanUseApp(cached.canUseApp);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!userKey || (hasCache && isSubscriptionAccessCacheFresh(userKey))) {
      return () => {
        isMounted = false;
      };
    }

    validateSubscriptionAccess(userKey)
      .then((nextCanUseApp) => {
        if (isMounted) {
          setCanUseApp(Boolean(nextCanUseApp));
        }
      })
      .catch(() => {
        if (isMounted) {
          // Em falhas transitorias de rede/API, mantem o ultimo estado seguro ou nao bloqueia a forca.
          setCanUseApp(cached?.canUseApp ?? true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userKey]);

  useEffect(() => {
    if (!userKey) {
      return undefined;
    }

    let isMounted = true;

    const validateInBackground = () => {
      validateSubscriptionAccess(userKey)
        .then((nextCanUseApp) => {
          if (isMounted) {
            setCanUseApp(Boolean(nextCanUseApp));
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    };

    const validateWhenVisible = () => {
      if (!document.hidden) {
        validateInBackground();
      }
    };

    const interval = window.setInterval(validateInBackground, BACKGROUND_CHECK_INTERVAL_MS);
    window.addEventListener('focus', validateInBackground);
    document.addEventListener('visibilitychange', validateWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', validateInBackground);
      document.removeEventListener('visibilitychange', validateWhenVisible);
    };
  }, [userKey]);

  if (loading) {
    return (
      <DecoratingWallLoader
        embedded
        phrase="Conferindo seu plano antes de liberar as ferramentas."
      />
    );
  }

  return canUseApp ? <Outlet /> : <Navigate replace state={{ from: location.pathname }} to="/subscription" />;
}
