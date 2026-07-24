import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import {
  readSitePreferences,
  saveSitePreferences,
  SITE_PREFERENCES_EVENT,
} from '../../utils/sitePreferences';

function ThemeIcon({ light }) {
  if (light) {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M20.4 15.2A8.2 8.2 0 0 1 8.8 3.6 8.3 8.3 0 1 0 20.4 15.2Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const location = useLocation();
  const [theme, setTheme] = useState(() => readSitePreferences().theme);
  const light = theme === 'light';
  const className = location.pathname === '/'
    ? 'site-theme-toggle site-theme-toggle--landing'
    : 'site-theme-toggle';

  useEffect(() => {
    const handlePreferencesChange = (event) => {
      setTheme(event.detail?.theme || readSitePreferences().theme);
    };

    window.addEventListener(SITE_PREFERENCES_EVENT, handlePreferencesChange);
    return () => window.removeEventListener(SITE_PREFERENCES_EVENT, handlePreferencesChange);
  }, []);

  const handleToggle = () => {
    const currentPreferences = readSitePreferences();
    const nextPreferences = saveSitePreferences({
      ...currentPreferences,
      theme: currentPreferences.theme === 'light' ? 'dark' : 'light',
    });
    setTheme(nextPreferences.theme);
  };

  return (
    <button
      aria-label={light ? 'Ativar fundo preto' : 'Ativar fundo branco'}
      aria-pressed={light}
      className={className}
      onClick={handleToggle}
      title={light ? 'Mudar para fundo preto' : 'Mudar para fundo branco'}
      type="button"
    >
      <span className="site-theme-toggle-icon"><ThemeIcon light={light} /></span>
      <span className="site-theme-toggle-copy">
        <small>Fundo</small>
        <strong>{light ? 'Branco' : 'Preto'}</strong>
      </span>
    </button>
  );
}
