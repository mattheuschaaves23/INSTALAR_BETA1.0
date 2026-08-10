import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useSubscription } from '../../contexts/SubscriptionContext';
import PlanUsage, { ProFeatureNotice } from '../Subscription/PlanUsage';
import ClientForm from '../Clients/ClientForm';

const INSTALLMENT_OPTIONS = Array.from({ length: 11 }, (_, index) => index + 2);

function BudgetIcon({ type }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (type) {
    case 'back':
      return (
        <svg {...props}>
          <path d="m14.5 5.5-6 6 6 6" />
        </svg>
      );
    case 'save':
      return (
        <svg {...props}>
          <path d="M5 4.5h10l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V4.5Z" />
          <path d="M8 4.5V9h6V4.5M8 20.5v-6h8v6" />
        </svg>
      );
    case 'measure':
      return (
        <svg {...props}>
          <path d="m4.5 15.5 11-11 4 4-11 11h-4Z" />
          <path d="m13 7 4 4M6 17.5l.01.01" />
        </svg>
      );
    case 'wallpaper':
      return (
        <svg {...props}>
          <path d="M6 6.5a1.5 1.5 0 0 1 1.5-1.5H16a2 2 0 0 1 2 2v2.2H9a2 2 0 0 0-2 2V18" />
          <path d="M9 18h4M13 18v2.5" />
          <path d="M8 8h2M12 8h2M10 11h2M8 14h2M12 14h2" />
        </svg>
      );
    case 'services':
      return (
        <svg {...props}>
          <path d="m4.5 19.5 5.2-5.2M14 6l4 4" />
          <path d="m8.5 5.5 10 10-2.3 2.3-10-10zM4.5 11.5l3 3" />
        </svg>
      );
    case 'summary':
      return (
        <svg {...props}>
          <path d="M6.5 5.5h11M6.5 10.5h11M6.5 15.5h7" />
          <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
        </svg>
      );
    case 'add':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M4.5 7.5h15" />
          <path d="M9.5 3.5h5l1 2.2h-7l1-2.2Z" />
          <path d="M7 7.5v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-10" />
        </svg>
      );
    case 'info':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 10v5M12 7.5h.01" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function createEnvironment() {
  return {
    name: '',
    height: '',
    width: '',
    rolls_manual: '',
    removal_included: false,
  };
}

function createStepState(isDone, isActive) {
  if (isActive) {
    return 'active';
  }

  if (isDone) {
    return 'done';
  }

  return 'idle';
}

export default function BudgetForm() {
  const navigate = useNavigate();
  const { isPro, refreshSubscription } = useSubscription();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [pricingMode, setPricingMode] = useState('roll');
  const [rollArea, setRollArea] = useState(4.5);
  const [pricePerRoll, setPricePerRoll] = useState(0);
  const [pricePerSquareMeter, setPricePerSquareMeter] = useState(10);
  const [removalPricePerRoll, setRemovalPricePerRoll] = useState(0);
  const [profileDefaults, setProfileDefaults] = useState({ rollPrice: 0, removalPricePerRoll: 0 });
  const [installmentEnabled, setInstallmentEnabled] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(3);
  const [environments, setEnvironments] = useState([createEnvironment()]);

  useEffect(() => {
    api.get('/clients').then((response) => setClients(response.data)).catch(() => null);

    api.get('/users/profile')
      .then((response) => {
        const profileDefaultRollPrice = Number(response.data.default_price_per_roll || 0);
        const profileDefaultRemovalPrice = Number(response.data.default_removal_price || 0);

        setProfileDefaults({
          rollPrice: profileDefaultRollPrice,
          removalPricePerRoll: profileDefaultRemovalPrice,
        });
        setPricePerRoll(profileDefaultRollPrice);
        setRemovalPricePerRoll(profileDefaultRemovalPrice);
      })
      .catch(() => null);
  }, []);

  const updateEnvironment = (index, field, value) => {
    setEnvironments((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? { ...item, [field]: value } : item))
    );
  };

  const addEnvironment = () => {
    if (!isPro) {
      toast('Vários ambientes no mesmo orçamento estão disponíveis no plano Pro.');
      return;
    }
    setEnvironments((current) => [...current, createEnvironment()]);
  };

  useEffect(() => {
    if (!isPro) {
      setEnvironments((current) => current.slice(0, 1));
    }
  }, [isPro]);

  const removeEnvironment = (index) => {
    setEnvironments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const removalIncluded = environments.some((environment) => Boolean(environment.removal_included));
  const rollYield = Number(rollArea);
  const effectiveRollArea = Number.isFinite(rollYield) && rollYield > 0 ? rollYield : 0;

  const environmentBreakdown = useMemo(
    () =>
      environments.map((environment) => {
        const height = Number(environment.height || 0);
        const width = Number(environment.width || 0);
        const area = height * width;
        const rollsAuto = effectiveRollArea > 0 ? Math.ceil(area / effectiveRollArea) : 0;
        const rollsManual = environment.rolls_manual ? Number(environment.rolls_manual) : null;
        const rollsForMode = pricingMode === 'roll' ? (rollsManual || rollsAuto) : rollsAuto;
        const baseSubtotal =
          pricingMode === 'square_meter'
            ? area * Number(pricePerSquareMeter || 0)
            : rollsForMode * Number(pricePerRoll || 0);
        return {
          area,
          baseSubtotal,
          removalIncluded: Boolean(environment.removal_included),
          rollsAuto,
          rollsForMode,
          total: baseSubtotal,
        };
      }),
    [effectiveRollArea, environments, pricePerRoll, pricePerSquareMeter, pricingMode]
  );

  const totals = useMemo(
    () =>
      (() => {
        const baseTotals = environmentBreakdown.reduce(
          (accumulator, environment) => ({
            area: accumulator.area + environment.area,
            rolls: accumulator.rolls + environment.rollsForMode,
            removalRolls: accumulator.removalRolls + (environment.removalIncluded ? environment.rollsForMode : 0),
            subtotal: accumulator.subtotal + environment.baseSubtotal,
            total: accumulator.total + environment.total,
          }),
          { area: 0, rolls: 0, removalRolls: 0, subtotal: 0, total: 0 }
        );
        const unitRemovalPrice = Number(removalPricePerRoll || 0);
        const removal = removalIncluded && Number.isFinite(unitRemovalPrice)
          ? baseTotals.removalRolls * unitRemovalPrice
          : 0;

        return {
          ...baseTotals,
          removal,
          total: baseTotals.subtotal + removal,
        };
      })(),
    [environmentBreakdown, removalIncluded, removalPricePerRoll]
  );

  const grandTotal = totals.total;
  const normalizedInstallments = installmentEnabled ? Number(installmentsCount || 2) : 1;
  const selectedClient = clients.find((client) => Number(client.id) === Number(clientId));
  const canCalculate = totals.area > 0;
  const canSave = canCalculate && grandTotal > 0 && Number(clientId) > 0;

  const steps = [
    { number: 1, label: 'Cliente', state: createStepState(Boolean(clientId), activeStep === 1) },
    { number: 2, label: 'Cálculo', state: createStepState(canCalculate && grandTotal > 0, activeStep === 2) },
    { number: 3, label: 'Resumo', state: createStepState(canCalculate && grandTotal > 0 && activeStep > 3, activeStep === 3) },
    { number: 4, label: 'Enviar', state: createStepState(false, activeStep === 4) },
  ];

  const continueFromClient = () => {
    if (!Number(clientId)) {
      toast.error('Escolha o cliente antes de montar o orçamento.');
      return;
    }
    setActiveStep(2);
  };

  const continueFromCalculation = () => {
    if (!canCalculate || grandTotal <= 0) {
      toast.error('Preencha as medidas e os valores para calcular o orçamento.');
      return;
    }
    setActiveStep(3);
  };

  const handleClear = () => {
    setClientId('');
    setPricingMode('roll');
    setRollArea(4.5);
    setPricePerRoll(profileDefaults.rollPrice);
    setPricePerSquareMeter(10);
    setRemovalPricePerRoll(profileDefaults.removalPricePerRoll);
    setInstallmentEnabled(false);
    setInstallmentsCount(3);
    setEnvironments([createEnvironment()]);
  };

  const handleClientCreated = (client) => {
    if (!client?.id) {
      return;
    }

    setClients((current) => [
      client,
      ...current.filter((item) => Number(item.id) !== Number(client.id)),
    ]);
    setClientId(String(client.id));
    refreshSubscription().catch(() => null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedClientId = Number(clientId);
    const normalizedPricePerRoll = Number(pricePerRoll);
    const normalizedPricePerSquareMeter = Number(pricePerSquareMeter);
    const normalizedRollArea = Number(rollArea);
    const normalizedRemovalPricePerRoll = Number(removalPricePerRoll);
    const normalizedInstallmentsCount = Number(installmentsCount);

    if (!Number.isInteger(normalizedClientId) || normalizedClientId <= 0) {
      toast.error('Selecione um cliente válido.');
      return;
    }

    if (pricingMode === 'roll' && (!Number.isFinite(normalizedPricePerRoll) || normalizedPricePerRoll <= 0)) {
      toast.error('Informe um preço por rolo maior que zero.');
      return;
    }

    if (!Number.isFinite(normalizedRollArea) || normalizedRollArea <= 0 || normalizedRollArea > 1000) {
      toast.error('Informe um rendimento de rolo válido.');
      return;
    }

    if (
      pricingMode === 'square_meter' &&
      (!Number.isFinite(normalizedPricePerSquareMeter) || normalizedPricePerSquareMeter <= 0)
    ) {
      toast.error('Informe um preço por metro quadrado maior que zero.');
      return;
    }

    if (
      removalIncluded &&
      (!Number.isFinite(normalizedRemovalPricePerRoll) || normalizedRemovalPricePerRoll < 0)
    ) {
      toast.error('Informe um valor de remoção por rolo válido.');
      return;
    }

    if (
      installmentEnabled &&
      (!Number.isInteger(normalizedInstallmentsCount) ||
        normalizedInstallmentsCount < 2 ||
        normalizedInstallmentsCount > 12)
    ) {
      toast.error('Escolha um parcelamento entre 2x e 12x.');
      return;
    }

    const invalidEnvironment = environments.find((environment) => {
      const height = Number(environment.height);
      const width = Number(environment.width);
      const hasManualRolls = String(environment.rolls_manual || '').trim() !== '';
      const manualRolls = hasManualRolls ? Number(environment.rolls_manual) : null;
      return (
        !String(environment.name || '').trim() ||
        !Number.isFinite(height) ||
        height <= 0 ||
        !Number.isFinite(width) ||
        width <= 0 ||
        (pricingMode === 'roll' && hasManualRolls && (!Number.isInteger(manualRolls) || manualRolls <= 0))
      );
    });

    if (invalidEnvironment) {
      toast.error('Revise nome, medidas e rolos dos ambientes.');
      return;
    }

    try {
      await api.post('/budgets', {
        client_id: normalizedClientId,
        pricing_mode: pricingMode,
        roll_area: normalizedRollArea,
        price_per_roll: normalizedPricePerRoll,
        price_per_square_meter: normalizedPricePerSquareMeter,
        installment_enabled: installmentEnabled,
        installments_count: installmentEnabled ? normalizedInstallmentsCount : 1,
        removal_included: removalIncluded,
        removal_price_per_roll: removalIncluded ? normalizedRemovalPricePerRoll : 0,
        environments: environments.map((environment) => ({
          name: environment.name,
          height: Number(environment.height),
          width: Number(environment.width),
          rolls_manual: pricingMode === 'roll' && environment.rolls_manual ? Number(environment.rolls_manual) : null,
          removal_included: Boolean(environment.removal_included),
        })),
      });

      await refreshSubscription();
      toast.success('Orçamento criado.');
      navigate('/budgets');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível criar o orçamento.');
    }
  };

  return (
    <section className="budget-modern-shell">
      <form className="budget-modern-form" id="budget-modern-form" onSubmit={handleSubmit}>
        <header className="budget-modern-topbar fade-up">
          <button className="budget-modern-back-button" onClick={() => navigate('/budgets')} type="button">
            <BudgetIcon type="back" />
          </button>

          <div className="budget-modern-topbar-copy">
            <h1>Novo orçamento</h1>
            <p>Cliente, cálculo, resumo e envio — uma etapa por vez.</p>
          </div>

          <span className="budget-modern-progress">Etapa {activeStep} de 4</span>
        </header>

        <PlanUsage className="fade-up" usageKey="monthly_budgets" />

        <section className="budget-modern-stepper fade-up" style={{ animationDelay: '0.04s' }}>
          {steps.map((step, index) => (
            <div className="budget-modern-step" key={step.number}>
              <div className="budget-modern-step-bubble" data-state={step.state}>
                {step.number}
              </div>
              {index < steps.length - 1 ? <span className="budget-modern-step-line" /> : null}
              <span className="budget-modern-step-label" data-state={step.state}>
                {step.label}
              </span>
            </div>
          ))}
        </section>

        <div className="budget-modern-layout">
          <main className="budget-modern-main">
            <section className="budget-modern-calculator-card fade-up" style={{ animationDelay: '0.06s' }}>
              <header className="budget-modern-card-head">
                <div className="budget-modern-head-icon">
                  <BudgetIcon type={activeStep === 1 ? 'summary' : activeStep === 4 ? 'save' : 'measure'} />
                </div>
                <div>
                  <h2>{activeStep === 1 ? 'Escolha o cliente' : activeStep === 2 ? 'Monte o orçamento' : activeStep === 4 ? 'Confirme o envio' : 'Revise o orçamento'}</h2>
                  <p>{activeStep === 1 ? 'Defina para quem este orçamento será criado.' : activeStep === 2 ? 'Preencha os detalhes para montar o orçamento em uma única etapa.' : activeStep === 4 ? 'Confira os dados finais antes de salvar o orçamento.' : 'Confira os valores antes de seguir para o envio.'}</p>
                </div>
              </header>

              {activeStep === 2 ? (
                <>
              <div className="budget-modern-section budget-modern-calculation-section">
                <div className="budget-modern-section-title">
                  <div>
                    <BudgetIcon type="measure" />
                    <span>Cálculo do orçamento</span>
                  </div>

                  <button className="budget-modern-inline-button" onClick={addEnvironment} type="button">
                    <BudgetIcon type="add" />
                    {isPro ? 'Adicionar ambiente' : 'Vários ambientes • Pro'}
                  </button>
                </div>

                <div className="budget-modern-mode-switch">
                  <button
                    className={pricingMode === 'roll' ? 'is-active' : ''}
                    onClick={() => setPricingMode('roll')}
                    type="button"
                  >
                    Cobrar por rolo
                  </button>
                  <button
                    className={pricingMode === 'square_meter' ? 'is-active' : ''}
                    onClick={() => setPricingMode('square_meter')}
                    type="button"
                  >
                    Cobrar por m²
                  </button>
                </div>

                <div className="budget-modern-note">
                  <BudgetIcon type="info" />
                  Informe as medidas de cada ambiente. O ajuste manual de rolos fica disponível quando necessário.
                </div>

                <div className="budget-modern-environments">
                  {environments.map((environment, index) => {
                    const details = environmentBreakdown[index];

                    return (
                      <article className="budget-modern-environment" key={`env-${index}`}>
                        <div className="budget-modern-environment-head">
                          <div>
                            <strong>Ambiente {index + 1}</strong>
                            <span>Defina nome e medidas deste espaço.</span>
                          </div>

                          {environments.length > 1 ? (
                            <button className="budget-modern-remove-button" onClick={() => removeEnvironment(index)} type="button">
                              <BudgetIcon type="trash" />
                            </button>
                          ) : null}
                        </div>

                        <div className="budget-modern-field-grid is-identity">
                          <label className="budget-modern-field budget-modern-field--full">
                            <span>Nome do ambiente</span>
                            <input
                              onChange={(event) => updateEnvironment(index, 'name', event.target.value)}
                              placeholder="Ex.: Sala principal"
                              required
                              value={environment.name}
                            />
                          </label>
                        </div>

                        <div className="budget-modern-field-grid">
                          <label className="budget-modern-field">
                            <span>Largura (m)</span>
                            <input
                              min="0.01"
                              onChange={(event) => updateEnvironment(index, 'width', event.target.value)}
                              placeholder="0,00"
                              required
                              step="0.01"
                              type="number"
                              value={environment.width}
                            />
                          </label>

                          <label className="budget-modern-field">
                            <span>Altura (m)</span>
                            <input
                              min="0.01"
                              onChange={(event) => updateEnvironment(index, 'height', event.target.value)}
                              placeholder="0,00"
                              required
                              step="0.01"
                              type="number"
                              value={environment.height}
                            />
                          </label>

                          <label className="budget-modern-field budget-modern-field--readonly">
                            <span>Área total</span>
                            <input disabled readOnly value={`${details.area.toFixed(2)} m²`} />
                          </label>
                        </div>

                        {pricingMode === 'roll' ? (
                          <div className="budget-modern-field-grid">
                            <label className="budget-modern-field budget-modern-field--full">
                              <span>Rolos manuais (opcional)</span>
                              <input
                                min="1"
                                onChange={(event) => updateEnvironment(index, 'rolls_manual', event.target.value)}
                                placeholder={`Automático: ${details.rollsAuto}`}
                                step="1"
                                type="number"
                                value={environment.rolls_manual}
                              />
                            </label>
                          </div>
                        ) : null}

                        <label className="budget-modern-toggle">
                          <input
                            checked={Boolean(environment.removal_included)}
                            onChange={(event) => updateEnvironment(index, 'removal_included', event.target.checked)}
                            type="checkbox"
                          />
                          <span>Remover o papel deste ambiente</span>
                        </label>

                      </article>
                    );
                  })}
                </div>

                <div className="budget-modern-payment-box budget-modern-removal-rate">
                  <label className="budget-modern-field">
                    <span>Valor da remoção por rolo/unidade</span>
                    <div className="budget-modern-currency-input">
                      <i>R$</i>
                      <input
                        disabled={!removalIncluded}
                        min="0"
                        onChange={(event) => setRemovalPricePerRoll(event.target.value)}
                        placeholder="0,00"
                        step="0.01"
                        type="number"
                        value={removalPricePerRoll}
                      />
                    </div>
                  </label>

                  <div className="budget-modern-note">
                    <BudgetIcon type="info" />
                    {removalIncluded
                      ? `${totals.removalRolls} rolo${totals.removalRolls === 1 ? '' : 's'} dos ambientes marcados × ${formatCurrency(removalPricePerRoll)} = ${formatCurrency(totals.removal)}`
                      : 'Marque os ambientes que precisam de remoção para liberar este valor.'}
                  </div>
                </div>

                <div className="budget-modern-calculation-divider" />

                <div className="budget-modern-field-grid budget-modern-material-grid">
                  {pricingMode === 'roll' ? (
                    <label className="budget-modern-field">
                      <span>Preço do rolo (R$)</span>
                      <div className="budget-modern-currency-input">
                        <i>R$</i>
                        <input
                          min="0.01"
                          onChange={(event) => setPricePerRoll(event.target.value)}
                          placeholder="0,00"
                          required
                          step="0.01"
                          type="number"
                          value={pricePerRoll}
                        />
                      </div>
                    </label>
                  ) : (
                    <label className="budget-modern-field">
                      <span>Valor por m²</span>
                      <div className="budget-modern-currency-input">
                        <i>R$</i>
                        <input
                          min="0.01"
                          onChange={(event) => setPricePerSquareMeter(event.target.value)}
                          placeholder="0,00"
                          required
                          step="0.01"
                          type="number"
                          value={pricePerSquareMeter}
                        />
                      </div>
                    </label>
                  )}

                  <label className="budget-modern-field">
                    <span>Rendimento do rolo</span>
                    <div className="budget-modern-currency-input">
                      <i>m²</i>
                      <input
                        inputMode="decimal"
                        min="0.01"
                        onChange={(event) => setRollArea(event.target.value)}
                        placeholder="Ex.: 4,5"
                        required
                        step="0.01"
                        type="number"
                        value={rollArea}
                      />
                    </div>
                  </label>

                </div>

                <div className="budget-modern-calculated-grid">
                  <article>
                    <span>Área total</span>
                    <strong>{totals.area.toFixed(2)} m²</strong>
                    <small>Base somada de todos os ambientes.</small>
                  </article>
                  <article>
                    <span>Rolos necessarios</span>
                    <strong>{totals.rolls} rolos</strong>
                    <small>{(totals.rolls * effectiveRollArea).toFixed(2)} m² previstos</small>
                  </article>
                  <article>
                    <span>Subtotal de materiais</span>
                    <strong>{formatCurrency(totals.subtotal)}</strong>
                    <small>{pricingMode === 'roll' ? 'Calculo por rolo.' : 'Calculo por metro quadrado.'}</small>
                  </article>
                </div>

                <div className="budget-modern-service-list">
                  <div className="budget-modern-service-row">
                    <span>Modo de cobrança</span>
                    <strong>{pricingMode === 'roll' ? 'Por rolo' : 'Por m²'}</strong>
                  </div>
                  <div className="budget-modern-service-row">
                    <span>Base de materiais</span>
                    <strong>{formatCurrency(totals.subtotal)}</strong>
                  </div>
                  <div className="budget-modern-service-row">
                    <span>Remoção ({totals.removalRolls} rolos marcados)</span>
                    <strong>{formatCurrency(totals.removal)}</strong>
                  </div>
                </div>

                <div className="budget-modern-calculation-divider" />

                <div className="budget-modern-payment-box">
                  <label className="budget-modern-toggle">
                    <input
                      checked={installmentEnabled}
                      onChange={(event) => setInstallmentEnabled(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Permitir pagamento parcelado</span>
                  </label>

                  {installmentEnabled ? (
                    <label className="budget-modern-field budget-modern-field--full">
                      <span>Parcelamento</span>
                      <select
                        onChange={(event) => setInstallmentsCount(Number(event.target.value))}
                        value={installmentsCount}
                      >
                        {INSTALLMENT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}x de {formatCurrency(grandTotal / option)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                {!isPro ? (
                  <ProFeatureNotice className="mt-4" title="Orçamento profissional">
                    No Pro, cada proposta pode ter vários ambientes e PDF com a sua marca.
                  </ProFeatureNotice>
                ) : null}
              </div>

              <div className="budget-modern-stage-actions">
                <button className="budget-modern-secondary-cta" onClick={() => setActiveStep(1)} type="button">
                  Voltar ao cliente
                </button>
                <button className="budget-modern-primary-cta" onClick={continueFromCalculation} type="button">
                  Revisar resumo
                </button>
              </div>
                </>
              ) : null}

              {activeStep === 1 ? (
              <div className="budget-modern-section">
                <div className="budget-modern-section-title">
                  <div>
                    <BudgetIcon type="summary" />
                    <span>1. Cliente</span>
                  </div>
                </div>

                <div className="budget-modern-client-choice" role="group" aria-label="Seleção de cliente">
                  <button
                    aria-pressed="true"
                    className="budget-modern-client-choice-button is-active"
                    onClick={() => document.getElementById('budget-client-select')?.focus()}
                    type="button"
                  >
                    Usar cliente existente
                  </button>
                  <button
                    className="budget-modern-client-choice-button"
                    onClick={() => setShowClientForm(true)}
                    type="button"
                  >
                    Criar cliente
                  </button>
                </div>

                <div className="budget-modern-field-grid">
                  <label className="budget-modern-field budget-modern-field--full">
                    <span>Cliente</span>
                    <select id="budget-client-select" onChange={(event) => setClientId(event.target.value)} required value={clientId}>
                      <option value="">
                        {clients.length ? 'Selecione um cliente' : 'Ainda não há clientes cadastrados'}
                      </option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="budget-modern-actions-bar">
                  <button className="budget-modern-primary-cta" onClick={continueFromClient} type="button">
                    Continuar para o cálculo
                  </button>
                  <button className="budget-modern-secondary-cta" onClick={handleClear} type="button">
                    Limpar dados
                  </button>
                </div>
              </div>

              ) : null}

              {activeStep === 4 ? (
                <div className="budget-modern-section budget-modern-send-stage">
                  <div className="budget-modern-section-title">
                    <div>
                      <BudgetIcon type="save" />
                      <span>4. Enviar orçamento</span>
                    </div>
                  </div>

                  <p className="budget-modern-send-copy">
                    O orçamento será salvo como pendente. Em seguida, você poderá baixar o PDF ou enviar no WhatsApp pela lista de orçamentos.
                  </p>

                  <div className="budget-modern-send-checks">
                    <div><span>Cliente</span><strong>{selectedClient?.name}</strong></div>
                    <div><span>Total</span><strong>{formatCurrency(grandTotal)}</strong></div>
                    <div><span>Pagamento</span><strong>{installmentEnabled ? `${normalizedInstallments}x` : 'À vista'}</strong></div>
                  </div>

                  <div className="budget-modern-stage-actions">
                    <button className="budget-modern-secondary-cta" onClick={() => setActiveStep(3)} type="button">
                      Voltar ao resumo
                    </button>
                    <button className="budget-modern-primary-cta" disabled={!canSave} type="submit">
                      Salvar orçamento
                    </button>
                  </div>
                </div>
              ) : null}

              {activeStep === 3 ? (
                <div className="budget-modern-section budget-modern-review-stage">
                  <div className="budget-modern-section-title">
                    <div>
                      <BudgetIcon type="summary" />
                      <span>3. Resumo</span>
                    </div>
                  </div>
                  <p className="budget-modern-send-copy">
                    Revise o cliente, os ambientes e os valores no painel ao lado. Se algo mudou, volte para ajustar antes de enviar.
                  </p>
                  <div className="budget-modern-calculated-grid">
                    <article><span>Cliente</span><strong>{selectedClient?.name || '—'}</strong><small>{selectedClient?.phone || selectedClient?.email || 'Contato não informado'}</small></article>
                    <article><span>Ambientes</span><strong>{environments.length}</strong><small>{totals.area.toFixed(2)} m² no total</small></article>
                    <article><span>Total</span><strong>{formatCurrency(grandTotal)}</strong><small>{installmentEnabled ? `${normalizedInstallments}x no pagamento` : 'Pagamento à vista'}</small></article>
                  </div>
                  <div className="budget-modern-stage-actions">
                    <button className="budget-modern-secondary-cta" onClick={() => setActiveStep(2)} type="button">
                      Ajustar cálculo
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </main>

          {activeStep === 3 ? (
          <aside className="budget-modern-summary-panel fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="budget-modern-summary-head">
              <p className="budget-modern-section-label">Resumo do orçamento</p>
              <h3>Valores finais</h3>
            </div>

            <div className="budget-modern-summary-list">
              <div className="budget-modern-summary-row">
                <span>Materiais ({totals.rolls} rolos)</span>
                <strong>{formatCurrency(totals.subtotal)}</strong>
              </div>
              <div className="budget-modern-summary-row">
                <span>Remoção por rolo ({totals.removalRolls} rolos marcados)</span>
                <strong>{formatCurrency(totals.removal)}</strong>
              </div>
              <div className="budget-modern-summary-row">
                <span>Forma de pagamento</span>
                <strong>{installmentEnabled ? `${normalizedInstallments}x` : 'A vista'}</strong>
              </div>
            </div>

            <div className="budget-modern-total-box">
              <span>Total do orçamento</span>
              <strong>{formatCurrency(grandTotal)}</strong>
              <small>
                Valor por m²: {totals.area > 0 ? formatCurrency(grandTotal / totals.area) : formatCurrency(0)}
              </small>
            </div>

            <div className="budget-modern-client-box">
              <span>Cliente selecionado</span>
              <strong>{selectedClient?.name || 'Escolha quem vai receber o orçamento'}</strong>
              <small>
                {selectedClient?.phone || selectedClient?.email || 'Os dados do cliente aparecem aqui.'}
              </small>
            </div>

            <div className="budget-modern-environment-summary">
              <p>Ambientes</p>
              {environments.map((environment, index) => {
                const details = environmentBreakdown[index];

                return (
                  <div className="budget-modern-mini-row" key={`summary-${index}`}>
                    <span>{environment.name || `Ambiente ${index + 1}`}</span>
                    <strong>{formatCurrency(details.total)}</strong>
                  </div>
                );
              })}
            </div>

            <div className="budget-modern-summary-actions">
              <button className="budget-modern-primary-cta" disabled={!canSave} onClick={() => setActiveStep(4)} type="button">
                Continuar para envio
              </button>
              <button className="budget-modern-secondary-cta" onClick={() => setActiveStep(2)} type="button">
                Ajustar cálculo
              </button>
            </div>
          </aside>
          ) : null}
        </div>
      </form>
      {showClientForm ? (
        <ClientForm
          onClose={() => setShowClientForm(false)}
          onSaved={handleClientCreated}
        />
      ) : null}
    </section>
  );
}
