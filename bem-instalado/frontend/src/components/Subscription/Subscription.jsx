import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router';
import api from '../../services/api';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { formatCurrency, formatDateTime, formatStatusLabel } from '../../utils/formatters';
import { isNativeStoreApp } from '../../utils/nativePlatform';
import PageIntro from '../Layout/PageIntro';

const FREE_ITEMS = [
  '5 interesses por mês',
  '15 clientes ativos',
  '5 orçamentos por mês',
  '1 ambiente por orçamento',
  '3 fotos e 3 horários futuros',
  'Agenda, suporte e avaliações essenciais',
];

const PRO_ITEMS = [
  'Interesses, clientes e orçamentos ilimitados',
  'Vários ambientes e parcelamento em 2x a 12x',
  'PDF profissional com a sua marca',
  'Dashboard comercial completo',
  'Análises avançadas de avaliações',
  'Personalização de cor e densidade',
];

function PlanCard({ active, badge, children, cta, description, items, price, title }) {
  return (
    <article className={`relative rounded-[28px] border p-6 ${active ? 'border-[var(--gold)] bg-[var(--gold-soft)]' : 'border-[var(--line)] bg-[var(--surface-soft)]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text)]">{title}</h2>
        </div>
        {active ? <span className="status-pill" data-tone="active">Plano atual</span> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
      <p className="mt-5 text-3xl font-semibold text-[var(--gold-strong)]">{price}</p>
      <div className="mt-5 grid gap-2">
        {items.map((item) => (
          <p className="flex gap-2 text-sm leading-6 text-[var(--muted)]" key={item}>
            <span aria-hidden="true" className="text-[var(--gold-strong)]">✓</span>
            <span>{item}</span>
          </p>
        ))}
      </div>
      {cta ? <div className="mt-6">{cta}</div> : null}
      {children}
    </article>
  );
}

export default function Subscription() {
  const confirm = useConfirm();
  const isStoreApp = isNativeStoreApp();
  const {
    subscription: contextSubscription,
    planAccess,
    isPro,
    refreshSubscription,
  } = useSubscription();
  const [subscription, setSubscription] = useState(contextSubscription);
  const [payment, setPayment] = useState(contextSubscription?.pending_payment || null);
  const [isPaying, setIsPaying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [paymentNeedsProfile, setPaymentNeedsProfile] = useState(false);

  const loadSubscription = useCallback(async () => {
    const response = await api.get('/subscriptions');
    setSubscription(response.data);
    setPayment(response.data.pending_payment || null);
    await refreshSubscription();
    return response.data;
  }, [refreshSubscription]);

  useEffect(() => {
    if (contextSubscription) {
      setSubscription(contextSubscription);
      setPayment((current) => current || contextSubscription.pending_payment || null);
    }
  }, [contextSubscription]);

  useEffect(() => {
    loadSubscription().catch((error) => {
      toast.error(error.response?.data?.error || 'Não foi possível carregar os planos.');
    });
  }, [loadSubscription]);

  const syncPaymentStatus = useCallback(async (externalId, silent = false) => {
    if (!externalId) return;
    try {
      const response = await api.get(`/subscriptions/payment/${externalId}`);
      if (response.data.payment) setPayment(response.data);
      if (response.data.status === 'paid') {
        toast.success('Pagamento confirmado. O plano Pro foi ativado.');
        setPayment(null);
        await loadSubscription();
      } else if (!silent) {
        toast('Pagamento ainda pendente.');
      }
    } catch (error) {
      if (!silent) toast.error(error.response?.data?.error || 'Não foi possível consultar o pagamento.');
    }
  }, [loadSubscription]);

  useEffect(() => {
    if (
      isStoreApp
      || !payment?.automaticConfirmation
      || payment?.payment?.status !== 'pending'
      || !payment?.payment?.external_id
    ) {
      return undefined;
    }
    const interval = window.setInterval(
      () => syncPaymentStatus(payment.payment.external_id, true),
      20000
    );
    return () => window.clearInterval(interval);
  }, [isStoreApp, payment, syncPaymentStatus]);

  const handlePay = async () => {
    if (isStoreApp || isPro) return;
    if (subscription?.payment_mode === 'disabled') {
      toast.error(subscription?.payment_notice || 'Pagamento temporariamente indisponível.');
      return;
    }

    try {
      setIsPaying(true);
      const response = await api.post('/subscriptions/pay');
      setPayment(response.data);
      setPaymentNeedsProfile(false);
      toast.success('Checkout mensal aberto com Pix e cartão.');
      if (response.data?.ticketUrl) window.location.assign(response.data.ticketUrl);
    } catch (error) {
      const code = error.response?.data?.code;
      setPaymentNeedsProfile([
        'PAYMENT_CUSTOMER_REQUIRED',
        'PAYMENT_CUSTOMER_NAME_REQUIRED',
        'PAYMENT_CUSTOMER_DOCUMENT_REQUIRED',
      ].includes(code));
      toast.error(error.response?.data?.error || 'Não foi possível abrir o checkout.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancel = async () => {
    const accepted = await confirm({
      title: 'Voltar para o plano Grátis?',
      message: 'A recorrência será cancelada. Seus clientes, orçamentos e demais dados não serão apagados.',
      confirmText: 'Voltar para o Grátis',
      cancelText: 'Manter o Pro',
    });
    if (!accepted) return;

    try {
      setIsCanceling(true);
      const response = await api.delete('/subscriptions');
      toast.success(response.data?.message || 'Plano Grátis ativado.');
      setPayment(null);
      await loadSubscription();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível cancelar agora.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCheck = async () => {
    try {
      setIsChecking(true);
      await syncPaymentStatus(payment?.payment?.external_id);
    } finally {
      setIsChecking(false);
    }
  };

  const usageRows = [
    ['Interesses no mês', planAccess.usage?.monthly_interests, planAccess.limits?.monthly_interests],
    ['Clientes', planAccess.usage?.clients, planAccess.limits?.clients],
    ['Orçamentos no mês', planAccess.usage?.monthly_budgets, planAccess.limits?.monthly_budgets],
    ['Fotos no portfólio', planAccess.usage?.portfolio_photos, planAccess.limits?.portfolio_photos],
    ['Horários futuros', planAccess.usage?.availability_slots, planAccess.limits?.availability_slots],
  ];
  const pricing = subscription?.pricing || { amount: 49.9, period: 'mês' };
  const currentPaymentIsPending = payment?.payment?.status === 'pending';

  return (
    <section className="page-shell space-y-7">
      <PageIntro
        description={isPro
          ? 'Seu plano Pro está ativo e todas as ferramentas avançadas estão liberadas.'
          : 'O plano Grátis não expira. Assine o Pro quando precisar crescer sem limites.'}
        eyebrow="Planos"
        stats={[
          {
            label: 'Plano atual',
            value: isPro ? 'PRO' : 'GRÁTIS',
            detail: isPro ? 'Recursos avançados liberados.' : 'Sem prazo para acabar.',
          },
          {
            label: 'Acesso',
            value: 'LIBERADO',
            detail: 'O aplicativo continua funcionando em qualquer plano.',
          },
          {
            label: 'Cobrança',
            value: isPro ? formatCurrency(pricing.amount) : 'R$ 0',
            detail: isPro ? `por ${pricing.period || 'mês'}` : 'Nenhuma cobrança no Grátis.',
          },
        ]}
        title={isPro ? 'Você está no InstalaPro Pro.' : 'Escolha o plano certo para o seu momento.'}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <PlanCard
          active={!isPro}
          badge="Plano permanente"
          description="O essencial para começar, atender clientes e organizar suas instalações."
          items={FREE_ITEMS}
          price="Grátis"
          title="InstalaPro Grátis"
        />
        <PlanCard
          active={isPro}
          badge="Para crescer"
          description="Mais volume, apresentação profissional e indicadores para tomar decisões."
          items={PRO_ITEMS}
          price={`${formatCurrency(pricing.amount)}/${pricing.period || 'mês'}`}
          title="InstalaPro Pro"
          cta={!isPro
            ? isStoreApp
              ? (
                <div className="rounded-[18px] border border-[var(--line)] p-4 text-sm leading-6 text-[var(--muted)]">
                  Para assinar, acesse sua conta pelo site. O aplicativo mostra o plano ativado automaticamente.
                </div>
              )
              : (
                <div className="flex flex-wrap gap-3">
                  <button
                    className="gold-button w-full sm:w-auto"
                    disabled={subscription?.payment_mode === 'disabled' || isPaying}
                    onClick={handlePay}
                    type="button"
                  >
                    {isPaying
                      ? 'Abrindo checkout...'
                      : currentPaymentIsPending
                        ? 'Continuar pagamento'
                        : 'Assinar com Pix ou cartão'}
                  </button>
                  {paymentNeedsProfile ? (
                    <Link className="ghost-button w-full sm:w-auto" to="/profile">
                      Completar perfil
                    </Link>
                  ) : null}
                </div>
              )
            : !isStoreApp && subscription?.access_mode === 'pro'
              ? (
                <button
                  className="ghost-button w-full sm:w-auto"
                  disabled={isCanceling}
                  onClick={handleCancel}
                  type="button"
                >
                  {isCanceling ? 'Cancelando...' : 'Cancelar e voltar ao Grátis'}
                </button>
              )
              : null}
        />
      </div>

      {!isPro ? (
        <section className="lux-panel p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Uso do plano Grátis</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text)]">Seus limites reiniciam todo mês</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">Interesses e orçamentos reiniciam no primeiro dia do mês.</p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {usageRows.map(([label, used, limit]) => (
              <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-soft)] p-4" key={label}>
                <p className="text-sm text-[var(--muted)]">{label}</p>
                <p className="mt-2 text-xl font-semibold text-[var(--text)]">
                  {Number(used || 0)} / {limit === null ? '∞' : limit}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!isStoreApp && payment ? (
        <section className="lux-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Checkout Asaas</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text)]">Pagamento em aberto</h2>
            </div>
            <span className="status-pill" data-tone={payment?.payment?.status}>
              {formatStatusLabel(payment?.payment?.status)}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-[var(--line)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Valor</p>
              <strong className="mt-2 block text-[var(--text)]">{formatCurrency(payment?.payment?.amount)}</strong>
            </div>
            <div className="rounded-[18px] border border-[var(--line)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Formas</p>
              <strong className="mt-2 block text-[var(--text)]">Pix ou cartão</strong>
            </div>
            <div className="rounded-[18px] border border-[var(--line)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Validade</p>
              <strong className="mt-2 block text-[var(--text)]">
                {payment.expirationDate ? formatDateTime(payment.expirationDate) : 'No checkout'}
              </strong>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {payment.ticketUrl ? (
              <a className="gold-button w-full sm:w-auto" href={payment.ticketUrl} rel="noreferrer" target="_blank">
                Continuar na Asaas
              </a>
            ) : null}
            <button
              className="ghost-button w-full sm:w-auto"
              disabled={isChecking || !payment?.payment?.external_id}
              onClick={handleCheck}
              type="button"
            >
              {isChecking ? 'Verificando...' : 'Verificar pagamento'}
            </button>
          </div>
        </section>
      ) : null}

      {!isStoreApp && subscription?.provider_error ? (
        <div className="rounded-[22px] border border-[rgba(223,107,107,0.32)] bg-[rgba(159,47,47,0.1)] p-5 text-sm text-[var(--text)]">
          {subscription.provider_error}
        </div>
      ) : null}
    </section>
  );
}
