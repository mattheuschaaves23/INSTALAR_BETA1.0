import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import PageIntro from '../Layout/PageIntro';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import {
  ACCENT_PRESETS,
  DEFAULT_SITE_PREFERENCES,
  readSitePreferences,
  resetSitePreferences,
  saveSitePreferences,
} from '../../utils/sitePreferences';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { ProFeatureNotice } from '../Subscription/PlanUsage';

const densityOptions = [
  { value: 'comfortable', label: 'Espaçosa', detail: 'Mais respiro' },
  { value: 'compact', label: 'Compacta', detail: 'Mais informação' },
];

const themeOptions = [
  { value: 'dark', label: 'Preto', detail: 'Alto contraste' },
  { value: 'light', label: 'Branco', detail: 'Mais luminoso' },
];

const motionOptions = [
  { value: 'smooth', label: 'Suaves', detail: 'Padrão' },
  { value: 'reduced', label: 'Reduzidas', detail: 'Menos movimento' },
];

const shortcutItems = [
  { to: '/profile', title: 'Perfil público', detail: 'Dados, fotos, documentos e segurança.', icon: 'user' },
  { to: '/subscription', title: 'Assinatura', detail: 'Plano, status e acesso ao painel.', icon: 'card' },
  { to: '/notifications', title: 'Notificações', detail: 'Avisos recentes da conta.', icon: 'bell' },
  { to: '/support', title: 'Suporte', detail: 'Atendimento e ideias para o produto.', icon: 'help' },
];

function SettingsIcon({ type }) {
  const sharedProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  const icons = {
    palette: <><path d="M12 4a8 8 0 0 0 0 16h1.2a1.8 1.8 0 0 0 1.3-3.05 1.3 1.3 0 0 1 .9-2.25H17a3 3 0 0 0 3-3A7.7 7.7 0 0 0 12 4Z" /><circle cx="8.2" cy="11" r=".8" /><circle cx="10.5" cy="8" r=".8" /><circle cx="14" cy="8.2" r=".8" /></>,
    layout: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M9 10v9" /></>,
    motion: <><path d="M4 16c4-8 8 8 12 0" /><path d="M16 8h4v4" /><path d="M20 8c-3.5 7-7-7-11 0" /></>,
    reset: <><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v5h-5" /></>,
    check: <path d="M5 12.5 10 17l9-10" />,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19c1.6-3 4.2-4.5 6.5-4.5s4.9 1.5 6.5 4.5" /></>,
    card: <><rect x="4" y="6.5" width="16" height="11" rx="2" /><path d="M4 10h16" /></>,
    bell: <><path d="M18 10.8a6 6 0 0 0-12 0c0 5-2 5.7-2 5.7h16s-2-.7-2-5.7" /><path d="M10 20a2.4 2.4 0 0 0 4 0" /></>,
    help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.8 9.4a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1.1-1.4 2.2" /><path d="M12 17.2h.01" /></>,
    trash: <><path d="M4.5 7h15" /><path d="M9 7V4.8h6V7" /><path d="m7 7 .7 12h8.6L17 7" /><path d="M10 10.5v5M14 10.5v5" /></>,
  };

  return <svg {...sharedProps}>{icons[type] || icons.palette}</svg>;
}

function PreferenceSegment({ label, options, value, onChange }) {
  return (
    <div className="settings-control-block">
      <p>{label}</p>
      <div className="settings-segment" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            className={value === option.value ? 'is-selected' : ''}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { isPro, loading: planLoading, subscription } = useSubscription();
  const confirm = useConfirm();
  const [preferences, setPreferences] = useState(() => readSitePreferences());
  const [savedAt, setSavedAt] = useState(() => new Date());
  const [deletePhrase, setDeletePhrase] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const currentPreset = useMemo(
    () => ACCENT_PRESETS.find((preset) => preset.value === preferences.accentColor),
    [preferences.accentColor]
  );
  const firstName = user?.name?.split(' ')[0] || 'usuário';

  const savePreference = (patch) => {
    if (subscription && !isPro && (
      (patch.accentColor && patch.accentColor !== DEFAULT_SITE_PREFERENCES.accentColor)
      || patch.density === 'compact'
    )) {
      toast('Cores personalizadas e modo compacto estão disponíveis no plano Pro.');
      return;
    }

    setPreferences((currentPreferences) => {
      const nextPreferences = saveSitePreferences({ ...currentPreferences, ...patch });
      setSavedAt(new Date());
      return nextPreferences;
    });
  };

  const handleReset = () => {
    const nextPreferences = resetSitePreferences();
    setPreferences(nextPreferences);
    setSavedAt(new Date());
    toast.success('Configurações restauradas.');
  };

  useEffect(() => {
    if (!planLoading && subscription && !isPro && (
      preferences.accentColor !== DEFAULT_SITE_PREFERENCES.accentColor
      || preferences.density === 'compact'
    )) {
      const nextPreferences = saveSitePreferences({
        ...preferences,
        accentColor: DEFAULT_SITE_PREFERENCES.accentColor,
        density: 'comfortable',
      });
      setPreferences(nextPreferences);
    }
  }, [isPro, planLoading, preferences, subscription]);

  const handleDeleteAccount = async (event) => {
    event.preventDefault();

    if (deletePhrase.trim().toUpperCase() !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar.');
      return;
    }

    const accepted = await confirm({
      title: 'Excluir conta definitivamente?',
      message: 'A conta, o perfil, os pedidos e os dados vinculados serão removidos. Uma assinatura recorrente ativa será cancelada. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir minha conta',
      cancelText: 'Manter minha conta',
      tone: 'danger',
    });

    if (!accepted) {
      return;
    }

    try {
      setIsDeletingAccount(true);
      await api.delete('/users/account', { data: { confirmation: 'EXCLUIR' } });
      await logout();
      window.location.replace('/instalador/entrar?conta=excluida');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível excluir a conta agora.');
      setIsDeletingAccount(false);
    }
  };

  const stats = [
    {
      label: 'Fundo',
      value: preferences.theme === 'light' ? 'Branco' : 'Preto',
      detail: 'Tema deste dispositivo',
    },
    {
      label: 'Cor secundária',
      value: currentPreset?.name || preferences.accentColor.toUpperCase(),
      detail: preferences.accentColor.toUpperCase(),
    },
    {
      label: 'Densidade',
      value: preferences.density === 'compact' ? 'Compacta' : 'Espaçosa',
      detail: 'Preferência da interface',
    },
    {
      label: 'Movimento',
      value: preferences.motion === 'reduced' ? 'Reduzido' : 'Suave',
      detail: 'Animações do painel',
    },
  ];

  return (
    <div className="page-shell settings-page">
      <PageIntro
        eyebrow="Conta"
        title="Configurações"
        description={`Ajustes do painel de ${firstName}: aparência, movimento e atalhos da conta.`}
        actions={(
          <button className="ghost-button" onClick={handleReset} type="button">
            <SettingsIcon type="reset" />
            Restaurar padrão
          </button>
        )}
        stats={stats}
      />

      <section className="settings-layout">
        <article className="settings-panel settings-panel--accent">
          <div className="settings-section-head">
            <span><SettingsIcon type="palette" /></span>
            <div>
              <p>Aparência</p>
              <h2>Cor secundária</h2>
            </div>
          </div>

          <div className="settings-color-row" aria-label="Cores prontas">
            {ACCENT_PRESETS.map((preset) => (
              <button
                aria-label={`Usar cor ${preset.name}`}
                className={preferences.accentColor === preset.value ? 'is-selected' : ''}
                key={preset.value}
                onClick={() => savePreference({ accentColor: preset.value })}
                disabled={!isPro && preset.value !== DEFAULT_SITE_PREFERENCES.accentColor}
                style={{ '--swatch-color': preset.value }}
                type="button"
              >
                <span />
                <strong>{preset.name}</strong>
              </button>
            ))}
          </div>

          <label className="settings-color-picker">
            <span>Cor personalizada</span>
            <input
              aria-label="Escolher cor personalizada"
              onChange={(event) => savePreference({ accentColor: event.target.value })}
              disabled={!isPro}
              type="color"
              value={preferences.accentColor}
            />
          </label>
          {!isPro ? (
            <ProFeatureNotice className="mt-4" title="Personalização Pro">
              No plano Grátis, o dourado padrão mantém a identidade do InstalaPro. O Pro libera todas as cores.
            </ProFeatureNotice>
          ) : null}

          <div className="settings-live-preview">
            <div>
              <span className="settings-preview-dot" />
              <p>Painel InstalaPro</p>
              <strong>Fundo {preferences.theme === 'light' ? 'branco' : 'preto'}, destaque na sua cor</strong>
            </div>
            <button type="button">Botão principal</button>
          </div>
        </article>

        <article className="settings-panel">
          <div className="settings-section-head">
            <span><SettingsIcon type="layout" /></span>
            <div>
              <p>Interface</p>
              <h2>Organização visual</h2>
            </div>
          </div>

          <PreferenceSegment
            label="Fundo"
            onChange={(value) => savePreference({ theme: value })}
            options={themeOptions}
            value={preferences.theme}
          />

          <PreferenceSegment
            label="Espaçamento"
            onChange={(value) => savePreference({ density: value })}
            options={isPro ? densityOptions : densityOptions.slice(0, 1)}
            value={preferences.density}
          />

          <PreferenceSegment
            label="Animações"
            onChange={(value) => savePreference({ motion: value })}
            options={motionOptions}
            value={preferences.motion}
          />
        </article>

        <article className="settings-panel settings-panel--shortcuts">
          <div className="settings-section-head">
            <span><SettingsIcon type="check" /></span>
            <div>
              <p>Conta</p>
              <h2>Atalhos úteis</h2>
            </div>
          </div>

          <div className="settings-shortcuts">
            {shortcutItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <span><SettingsIcon type={item.icon} /></span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="settings-panel settings-panel--status">
          <div className="settings-save-state">
            <span><SettingsIcon type="check" /></span>
            <div>
              <p>Salvo automaticamente</p>
              <strong>{savedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
          </div>
          <small>
            As preferências ficam neste dispositivo e são aplicadas quando o painel abre.
          </small>
        </article>

        <article className="settings-panel settings-panel--danger">
          <div className="settings-section-head">
            <span><SettingsIcon type="trash" /></span>
            <div>
              <p>Privacidade</p>
              <h2>Exclusão da conta</h2>
            </div>
          </div>

          {user?.is_admin ? (
            <p className="settings-danger-copy">
              A conta administrativa principal não pode ser excluída por esta tela. Transfira a
              administração antes de solicitar a exclusão pelo suporte.
            </p>
          ) : (
            <>
              <p className="settings-danger-copy">
                A exclusão é definitiva. Perfil, fotos, pedidos, agenda, orçamentos e demais dados
                ligados à conta serão removidos. Registros financeiros exigidos por lei podem ser
                conservados pelo provedor de pagamento durante o prazo legal.
              </p>

              <form className="settings-delete-form" onSubmit={handleDeleteAccount}>
                <label htmlFor="delete-account-confirmation">
                  Para confirmar, digite <strong>EXCLUIR</strong>
                </label>
                <div>
                  <input
                    autoComplete="off"
                    id="delete-account-confirmation"
                    onChange={(event) => setDeletePhrase(event.target.value)}
                    placeholder="EXCLUIR"
                    spellCheck="false"
                    value={deletePhrase}
                  />
                  <button
                    className="danger-button"
                    disabled={isDeletingAccount || deletePhrase.trim().toUpperCase() !== 'EXCLUIR'}
                    type="submit"
                  >
                    {isDeletingAccount ? 'Excluindo conta...' : 'Excluir minha conta'}
                  </button>
                </div>
              </form>
            </>
          )}

          <Link className="settings-privacy-link" to="/excluir-conta">
            Entenda o processo e quais dados são excluídos
          </Link>
        </article>
      </section>
    </div>
  );
}
