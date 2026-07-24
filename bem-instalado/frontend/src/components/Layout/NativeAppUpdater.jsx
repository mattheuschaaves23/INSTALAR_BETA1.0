import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import {
  checkForInstallerAppUpdate,
  downloadAndInstallInstallerUpdate,
  getInstallerUpdatePermission,
  isNativeInstallerApp,
  listenToInstallerUpdateProgress,
  openInstallerUpdatePermission,
} from '../../services/installerAppUpdate';

const BACKGROUND_CHECK_INTERVAL_MS = 15 * 60 * 1000;

function UpdateIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function statusCopy(status, progress) {
  if (status === 'permission') {
    return 'Ative “Permitir desta fonte” na tela do Android e volte para continuar.';
  }

  if (status === 'preparing') {
    return 'Preparando o download seguro da atualização.';
  }

  if (status === 'downloading') {
    return progress >= 0
      ? `Baixando a atualização: ${progress}%`
      : 'Baixando a atualização com segurança.';
  }

  if (status === 'opening') {
    return 'O instalador do Android foi aberto. Toque em “Atualizar” para concluir.';
  }

  return '';
}

export default function NativeAppUpdater() {
  const [update, setUpdate] = useState(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState('ready');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const lastCheckRef = useRef(0);
  const checkingRef = useRef(false);
  const dismissedVersionRef = useRef('');

  const checkForUpdate = useCallback(async () => {
    if (!isNativeInstallerApp() || checkingRef.current) {
      return;
    }

    checkingRef.current = true;
    lastCheckRef.current = Date.now();

    try {
      const nextUpdate = await checkForInstallerAppUpdate();

      if (nextUpdate?.available && dismissedVersionRef.current !== nextUpdate.version) {
        setUpdate(nextUpdate);
        setStatus('ready');
        setErrorMessage('');
        setVisible(true);
      }
    } catch (_error) {
      // A verificação é silenciosa para não impedir o uso do aplicativo offline.
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isNativeInstallerApp()) {
      return undefined;
    }

    let progressHandle;
    let appStateHandle;
    let disposed = false;
    const timer = window.setTimeout(checkForUpdate, 1400);

    listenToInstallerUpdateProgress(({ percent }) => {
      const normalizedPercent = Number.isFinite(Number(percent))
        ? Math.max(-1, Math.min(100, Number(percent)))
        : -1;
      setProgress(normalizedPercent);
      setStatus('downloading');
    })
      .then((handle) => {
        if (disposed) {
          handle.remove();
        } else {
          progressHandle = handle;
        }
      })
      .catch(() => null);

    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && Date.now() - lastCheckRef.current >= BACKGROUND_CHECK_INTERVAL_MS) {
        checkForUpdate();
      }
    })
      .then((handle) => {
        if (disposed) {
          handle.remove();
        } else {
          appStateHandle = handle;
        }
      })
      .catch(() => null);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      progressHandle?.remove();
      appStateHandle?.remove();
    };
  }, [checkForUpdate]);

  const startUpdate = useCallback(async () => {
    if (!update || status === 'preparing' || status === 'downloading') {
      return;
    }

    setErrorMessage('');
    setStatus('preparing');
    setProgress(0);

    try {
      const permission = await getInstallerUpdatePermission();

      if (!permission?.allowed) {
        await openInstallerUpdatePermission();
        setStatus('permission');
        return;
      }

      const result = await downloadAndInstallInstallerUpdate(update.downloadUrl);

      if (result?.permissionRequired) {
        await openInstallerUpdatePermission();
        setStatus('permission');
        return;
      }

      setProgress(100);
      setStatus('opening');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error?.message || 'Não foi possível concluir a atualização. Verifique sua internet e tente novamente.'
      );
    }
  }, [status, update]);

  if (!isNativeInstallerApp() || !visible || !update) {
    return null;
  }

  const isBusy = status === 'preparing' || status === 'downloading';
  const primaryLabel = status === 'permission'
    ? 'Voltei, continuar'
    : status === 'opening'
      ? 'Abrir novamente'
      : status === 'error'
        ? 'Tentar novamente'
        : 'Atualizar agora';
  const helperText = errorMessage || statusCopy(status, progress);
  const postponeUpdate = () => {
    dismissedVersionRef.current = update.version;
    setVisible(false);
  };

  return (
    <div className="native-update-backdrop">
      <section
        aria-describedby="native-update-description"
        aria-labelledby="native-update-title"
        aria-modal="true"
        className="native-update-dialog"
        role="dialog"
      >
        <div className="native-update-icon">
          <UpdateIcon />
        </div>

        <div className="native-update-heading">
          <span>Nova versão disponível</span>
          <h2 id="native-update-title">Atualize sem perder seus dados</h2>
          <p id="native-update-description">
            InstalaPro {update.version} está pronta. Ela será instalada por cima da versão {update.currentVersion},
            mantendo sua conta e suas informações.
          </p>
        </div>

        <div className="native-update-version-row">
          <span>Versão atual <strong>{update.currentVersion}</strong></span>
          <i aria-hidden="true">→</i>
          <span>Nova versão <strong>{update.version}</strong></span>
        </div>

        {isBusy ? (
          <div
            aria-label={progress >= 0 ? `Download em ${progress}%` : 'Download em andamento'}
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={progress >= 0 ? progress : undefined}
            className="native-update-progress"
            role="progressbar"
          >
            <span style={{ width: `${progress >= 0 ? progress : 14}%` }} />
          </div>
        ) : null}

        {helperText ? (
          <p className={`native-update-status ${status === 'error' ? 'is-error' : ''}`} role="status">
            {helperText}
          </p>
        ) : null}

        <div className="native-update-actions">
          <button
            className="native-update-later"
            disabled={isBusy}
            onClick={postponeUpdate}
            type="button"
          >
            Depois
          </button>
          <button
            className="native-update-primary"
            disabled={isBusy}
            onClick={startUpdate}
            type="button"
          >
            {isBusy ? 'Baixando…' : primaryLabel}
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <p className="native-update-security">
          O arquivo é validado pelo Android e pela assinatura oficial da InstalaPro antes da instalação.
        </p>
      </section>
    </div>
  );
}
