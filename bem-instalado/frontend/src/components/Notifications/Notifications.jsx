import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import PageIntro from '../Layout/PageIntro';
import PaginationControls from '../Layout/PaginationControls';
import { notifyPanelBadgeCountsChanged } from '../Layout/panelBadgeCounts';
import { formatDateTime, formatStatusLabel } from '../../utils/formatters';
import { getWebPushSupport, registerWebPushNotifications } from '../../services/webPushNotifications';

const NOTIFICATIONS_PER_PAGE = 8;

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [webPush, setWebPush] = useState(() => getWebPushSupport());
  const [activatingWebPush, setActivatingWebPush] = useState(false);

  const loadItems = async () => {
    try {
      const response = await api.get('/notifications');
      setItems(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível carregar as notificações.');
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await loadItems();
      notifyPanelBadgeCountsChanged();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível atualizar a notificação.');
    }
  };

  const activateWebPush = async () => {
    try {
      setActivatingWebPush(true);
      const result = await registerWebPushNotifications();
      setWebPush({ ...getWebPushSupport(), ...result });
      if (result.enabled) toast.success('Notificações do navegador ativadas.');
      else if (result.permission === 'denied') toast.error('As notificações foram bloqueadas no navegador.');
      else toast.error('As notificações do navegador ainda não estão disponíveis.');
    } catch (_error) {
      toast.error('Não foi possível ativar as notificações agora.');
    } finally {
      setActivatingWebPush(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / NOTIFICATIONS_PER_PAGE));
  const normalizedPage = Math.min(currentPage, totalPages);
  const start = (normalizedPage - 1) * NOTIFICATIONS_PER_PAGE;
  const paginatedItems = items.slice(start, start + NOTIFICATIONS_PER_PAGE);

  return (
    <section className="page-shell space-y-7">
      <PageIntro
        description="Uma central limpa para acompanhar tudo o que entrou na operação sem depender de memória ou de mensagens perdidas."
        eyebrow="Sinais do sistema"
        stats={[
          { label: 'Total de avisos', value: `${items.length}`, detail: 'Todas as notificações recentes.' },
          {
            label: 'Não lidas',
            value: `${items.filter((item) => !item.read).length}`,
            detail: 'Pontos que ainda merecem sua atenção.',
          },
          {
            label: 'Lidas',
            value: `${items.filter((item) => item.read).length}`,
            detail: 'Histórico já processado por você.',
          },
        ]}
        title="Avisos da sua conta."
      />

      <aside className="notification-web-push" aria-live="polite">
        <div>
          <p>Notificações</p>
          <h2>Receba avisos mesmo com o painel fechado</h2>
          <span>
            {webPush.enabled || webPush.permission === 'granted'
              ? 'Seu navegador está autorizado a receber avisos desta conta.'
              : webPush.supported
                ? 'Ative uma vez neste dispositivo para receber oportunidades e mudanças de agenda.'
                : 'Notificações no navegador exigem uma versão atualizada do Chrome, Edge, Firefox ou Safari.'}
          </span>
        </div>
        <button
          className="gold-button"
          disabled={!webPush.supported || activatingWebPush || webPush.enabled || webPush.permission === 'granted'}
          onClick={activateWebPush}
          type="button"
        >
          {activatingWebPush ? 'Ativando...' : webPush.enabled || webPush.permission === 'granted' ? 'Ativado neste navegador' : 'Ativar notificações'}
        </button>
      </aside>

      <div className="grid gap-4">
        {paginatedItems.length > 0 ? (
          <div className="list-surface notification-surface">
            {paginatedItems.map((item, index) => (
              <article
                className="list-row fade-up"
                key={item.id}
                style={{ animationDelay: `${0.08 + index * 0.05}s` }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="break-words text-xl font-semibold text-[var(--text)]">{item.title}</p>
                      <span className="status-pill" data-tone={item.read ? 'completed' : item.type}>
                        {item.read ? 'Lida' : formatStatusLabel(item.type)}
                      </span>
                    </div>
                    <p className="mt-4 break-words text-sm leading-7 text-[var(--muted)]">{item.message}</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>

                  {!item.read ? (
                    <button className="gold-button" onClick={() => markAsRead(item.id)} type="button">
                      Marcar como lida
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <PaginationControls
            currentPage={normalizedPage}
            onPageChange={setCurrentPage}
            totalPages={totalPages}
          />
        ) : null}

        {items.length === 0 ? (
          <div className="empty-state">
            Nenhum aviso por enquanto. Quando o sistema tiver novas ações, elas aparecem aqui.
          </div>
        ) : null}
      </div>
    </section>
  );
}
