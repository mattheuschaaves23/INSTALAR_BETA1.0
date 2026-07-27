import { useEffect, useState } from 'react';
import api from '../../services/api';

const FALLBACK_DOWNLOAD_URL = 'https://github.com/mattheuschaaves23/Instalar/releases/latest/download/InstalaPro-Instaladores.apk';
const FALLBACK_VERSION = '1.0.10';

function formatFileSize(value) {
  const bytes = Number(value || 0);

  if (!bytes) {
    return null;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function AppDownload() {
  const [release, setRelease] = useState({
    downloadUrl: FALLBACK_DOWNLOAD_URL,
    size: null,
    version: FALLBACK_VERSION,
  });

  useEffect(() => {
    let active = true;

    api.get('/public/installer-app-release')
      .then(({ data }) => {
        if (!active) return;

        setRelease({
          downloadUrl: data.downloadUrl || FALLBACK_DOWNLOAD_URL,
          size: formatFileSize(data.size),
          version: data.version || FALLBACK_VERSION,
        });
      })
      .catch(() => {
        // O link permanente continua disponível se a consulta da versão falhar.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="installer-app-page">
      <header className="installer-app-page-header">
        <div>
          <p>APLICATIVO</p>
          <h1>Baixar app</h1>
          <span>Leve seu painel de trabalho com você.</span>
        </div>
        <span className="installer-app-page-status"><i /> Versão atualizada</span>
      </header>

      <aside aria-labelledby="installer-app-download-title" className="installer-app-download installer-app-download--page">
        <div aria-hidden="true" className="installer-app-download-visual">
          <span className="installer-app-download-orbit" />
          <span className="installer-app-download-phone">
            <i />
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
              <rect height="14" rx="2.5" width="16" x="4" y="6" />
              <path d="M4 12h16M9 15.5h6" />
            </svg>
          </span>
        </div>

        <div className="installer-app-download-copy">
          <span className="installer-app-download-kicker"><i /> InstalaPro para instaladores</span>
          <h2 id="installer-app-download-title">Seu trabalho inteiro no celular</h2>
          <p>Acesse oportunidades, agenda, clientes e orçamentos de onde estiver.</p>
          <div className="installer-app-download-meta">
            <span>Android 7+</span>
            <span>Versão {release.version}</span>
            {release.size ? <span>{release.size}</span> : null}
          </div>
        </div>

        <a
          className="installer-app-download-button"
          href={release.downloadUrl}
          rel="noreferrer"
          target="_blank"
        >
          <DownloadIcon />
          <span><small>Baixar agora</small><strong>Aplicativo Android</strong></span>
          <b aria-hidden="true">→</b>
        </a>
      </aside>

      <div className="installer-app-page-notes">
        <article>
          <span>1</span>
          <div>
            <strong>Baixe o arquivo</strong>
            <p>Toque no botão acima para baixar o APK oficial.</p>
          </div>
        </article>
        <article>
          <span>2</span>
          <div>
            <strong>Autorize a instalação</strong>
            <p>Se o Android pedir, permita instalar por este navegador.</p>
          </div>
        </article>
        <article>
          <span>3</span>
          <div>
            <strong>Entre na sua conta</strong>
            <p>Use o mesmo login de instalador utilizado no site.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
