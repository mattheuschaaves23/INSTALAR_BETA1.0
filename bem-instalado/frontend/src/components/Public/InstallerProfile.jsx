import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DecoratingWallLoader from '../Layout/DecoratingWallLoader';
import './Home.css';
import { formatCurrency, formatLongDate, formatShortDate } from '../../utils/formatters';
import { formatInstallationDays } from '../../utils/installerDays';
import PageMetadata from './PageMetadata';

const emptyReviewForm = {
  reviewer_name: '',
  reviewer_region: '',
  rating: 5,
  comment: '',
};

const defaultMarketplace = {
  title: 'Loja Oficial InstalaPro',
  description:
    'Materiais para todos os estilos, com atendimento especializado para você encontrar o acabamento ideal.',
  url: 'https://www.beminstalado.com.br',
  cta_label: 'Visitar loja oficial',
  highlights: ['Papel de parede', 'Infantil e ambientes', 'Pagamento via Pix'],
};

function getInitials(name) {
  return (name || 'IP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function RatingStars({ value }) {
  const rounded = Math.round(Number(value || 0));

  return (
    <span aria-label={`${rounded} de 5 estrelas`} className="installer-profile-rating-stars">
      {Array.from({ length: 5 }).map((_, index) => (
        <i className={index < rounded ? 'is-filled' : ''} key={index}>★</i>
      ))}
    </span>
  );
}

function groupAvailabilitySlots(slots = []) {
  return slots.reduce((accumulator, slot) => {
    if (!slot.slot_date) {
      return accumulator;
    }

    if (!accumulator[slot.slot_date]) {
      accumulator[slot.slot_date] = [];
    }

    accumulator[slot.slot_date].push(slot);
    return accumulator;
  }, {});
}

function getClientLoginPath(nextPath) {
  return `/cliente/entrar?next=${encodeURIComponent(nextPath)}`;
}

export default function InstallerProfile() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payload, setPayload] = useState(null);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);
  const [sendingReview, setSendingReview] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await api.get(`/public/installers/${id}`);
      setPayload(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível carregar o perfil do instalador.');
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleReviewChange = (event) => {
    const { name, value } = event.target;
    setReviewForm((current) => ({
      ...current,
      [name]: name === 'rating' ? Number(value) : value,
    }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    const isOwnProfile = Boolean(user && Number(user.id) === Number(id));
    const reviewerName = reviewForm.reviewer_name.trim();

    if (!user) {
      toast('Entre para avaliar o instalador escolhido.');
      navigate(getClientLoginPath(`/installers/${id}#avaliar-instalador`));
      return;
    }

    if (isOwnProfile) {
      toast.error('Você não pode avaliar o seu próprio perfil.');
      return;
    }

    if (!reviewerName) {
      toast.error('Informe seu nome para enviar a avaliação.');
      return;
    }

    setSendingReview(true);

    try {
      await api.post(`/public/installers/${id}/reviews`, {
        service_request_id: Number(new URLSearchParams(location.search).get('pedido')) || undefined,
        reviewer_name: reviewerName,
        reviewer_region: reviewForm.reviewer_region.trim(),
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment.trim(),
      });

      toast.success('Avaliação enviada com sucesso.');
      setReviewForm(emptyReviewForm);
      await loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível enviar a avaliação.');
    } finally {
      setSendingReview(false);
    }
  };

  const requireClientLogin = (event, nextPath, message) => {
    if (user) {
      return true;
    }

    event?.preventDefault();
    toast(message);
    navigate(getClientLoginPath(nextPath));
    return false;
  };

  if (!payload) {
    return <DecoratingWallLoader phrase="Preparando o perfil deste profissional." />;
  }

  const { installer, reviews = [], marketplace: apiMarketplace } = payload;
  const marketplace = apiMarketplace || defaultMarketplace;
  const groupedSlots = groupAvailabilitySlots(installer.availability_slots || []);
  const groupedSlotEntries = Object.entries(groupedSlots).sort(([left], [right]) => left.localeCompare(right));
  const isOwnInstallerProfile = Boolean(user && Number(user.id) === Number(installer.id));
  const serviceRequestId = Number(new URLSearchParams(location.search).get('pedido')) || null;
  const locationLabel =
    [installer.city, installer.state].filter(Boolean).join(' · ') ||
    installer.service_region ||
    'Região de atendimento a confirmar';
  const hasReviews = Number(installer.review_count || 0) > 0;
  const warrantyLabel = installer.safety?.provides_warranty
    ? `${installer.safety.warranty_days || 0} dias de garantia`
    : 'Garantia a combinar';
  const requestPath = serviceRequestId ? '/cliente/pedido' : '/cliente';
  const requestActionLabel = serviceRequestId ? 'Voltar aos interessados' : 'Publicar meu pedido';

  return (
    <main className="installer-public-page">
      <PageMetadata
        canonicalPath={`/installers/${installer.id}`}
        description={`${installer.display_name || installer.name} é instalador(a) de papel de parede${installer.city ? ` em ${installer.city}` : ''}. Veja perfil, avaliações e disponibilidade na InstalaPro.`}
        title={`${installer.display_name || installer.name} | Instalador de papel de parede`}
      />

      <header className="installer-profile-nav">
        <Link className="installer-profile-nav-back" to={serviceRequestId ? '/cliente/pedido' : '/cliente'}>
          ← {serviceRequestId ? 'Voltar aos interessados' : 'Encontrar instaladores'}
        </Link>
        <Link aria-label="Ir para a página inicial" className="installer-profile-nav-brand" to="/">
          Instala<span>Pro</span>
        </Link>
        <a className="installer-profile-nav-link" href="#avaliacoes-instalador">Avaliações</a>
      </header>

      <div className="installer-profile-shell">
        <section className="installer-profile-hero">
          <div className="installer-profile-hero-glow" aria-hidden="true" />
          <div className="installer-profile-hero-intro">
            <div className="installer-profile-avatar-wrap">
              {installer.installer_photo ? (
                <img alt={`Foto de ${installer.display_name}`} className="installer-profile-avatar" src={installer.installer_photo} />
              ) : installer.logo ? (
                <img alt={`Logo de ${installer.display_name}`} className="installer-profile-avatar" src={installer.logo} />
              ) : (
                <div className="installer-profile-avatar installer-profile-avatar--initials">{getInitials(installer.display_name)}</div>
              )}
              {installer.certificate_verified || installer.safety?.document_masked ? <span className="installer-profile-verified">✓</span> : null}
            </div>

            <div className="installer-profile-hero-copy">
              <p className="installer-profile-kicker">Instalador parceiro</p>
              <h1>{installer.display_name}</h1>
              <p className="installer-profile-location">{locationLabel}</p>
              <div className="installer-profile-rating-line">
                <RatingStars value={installer.average_rating} />
                <strong>{hasReviews ? Number(installer.average_rating || 0).toFixed(1) : 'Novo perfil'}</strong>
                <span>{hasReviews ? `${installer.review_count} avaliações` : 'Pronto para atender'}</span>
              </div>
            </div>
          </div>

          <div className="installer-profile-hero-body">
            <p>{installer.bio || 'Profissional especializado em instalações cuidadosas, com atendimento organizado do orçamento à finalização.'}</p>
            <div className="installer-profile-trust-tags">
              {installer.safety?.document_masked ? <span>Documento verificado</span> : <span>Dados profissionais cadastrados</span>}
              {installer.safety?.accepts_service_contract ? <span>Contrato de serviço</span> : null}
              {installer.safety?.provides_warranty ? <span>{warrantyLabel}</span> : null}
              {installer.featured_installer ? <span>Em destaque</span> : null}
            </div>
          </div>

          <div className="installer-profile-hero-actions">
            <Link className="installer-profile-primary-action" to={requestPath}>{requestActionLabel}</Link>
            <a className="installer-profile-secondary-action" href="#disponibilidade">Ver disponibilidade</a>
          </div>

          <div className="installer-profile-hero-stats" aria-label="Resumo do profissional">
            <article><strong>{installer.completed_jobs || 0}</strong><span>instalações concluídas</span></article>
            <article><strong>{installer.unique_clients_served || 0}</strong><span>clientes atendidos</span></article>
            <article><strong>{installer.review_count || 0}</strong><span>avaliações recebidas</span></article>
          </div>
        </section>

        <section className="installer-profile-layout">
          <div className="installer-profile-main-column">
            <section className="installer-profile-section installer-profile-about">
              <div className="installer-profile-section-heading">
                <p>Como funciona</p>
                <h2>Atendimento pensado para sua instalação</h2>
              </div>
              <div className="installer-profile-detail-grid">
                <article>
                  <span>Região atendida</span>
                  <strong>{locationLabel}</strong>
                  <p>{installer.service_region || 'A área exata é confirmada antes do orçamento.'}</p>
                </article>
                <article>
                  <span>Horários</span>
                  <strong>{installer.service_hours || 'A combinar'}</strong>
                  <p>Dias de instalação: {formatInstallationDays(installer.installation_days)}</p>
                </article>
                <article>
                  <span>Forma de trabalho</span>
                  <p>{installer.installation_method || 'Cada ambiente é analisado antes da instalação para orientar o melhor acabamento.'}</p>
                </article>
              </div>
            </section>

            <section className="installer-profile-section installer-profile-pricing">
              <div className="installer-profile-section-heading">
                <p>Referência de valores</p>
                <h2>Custos apresentados com transparência</h2>
              </div>
              <div className="installer-profile-price-grid">
                <article><span>Visita técnica</span><strong>{formatCurrency(installer.base_service_cost)}</strong></article>
                <article><span>Deslocamento</span><strong>{formatCurrency(installer.travel_fee)}</strong></article>
                <article><span>Instalação por rolo</span><strong>{formatCurrency(installer.default_price_per_roll)}</strong></article>
                <article><span>Remoção</span><strong>{formatCurrency(installer.default_removal_price)}</strong></article>
              </div>
              <p className="installer-profile-section-note">Os valores servem como referência. O orçamento final considera ambiente, medida, material e condições do local.</p>
            </section>

            <section className="installer-profile-section installer-profile-portfolio">
              <div className="installer-profile-section-heading installer-profile-section-heading--inline">
                <div><p>Portfólio</p><h2>Instalações realizadas</h2></div>
                {installer.certificate_file ? (
                  <a className="installer-profile-text-link" href={installer.certificate_file} rel="noreferrer" target="_blank">Ver certificado</a>
                ) : null}
              </div>
              {Array.isArray(installer.installation_gallery) && installer.installation_gallery.length > 0 ? (
                <div className="installer-profile-gallery">
                  {installer.installation_gallery.slice(0, 8).map((photo, index) => (
                    <img
                      alt={`Instalação ${index + 1} de ${installer.display_name}`}
                      decoding="async"
                      key={`${index}-${photo.slice(0, 24)}`}
                      loading="lazy"
                      src={photo}
                    />
                  ))}
                </div>
              ) : (
                <div className="installer-profile-portfolio-empty">
                  <strong>Portfólio em atualização</strong>
                  <p>As fotos dos trabalhos deste instalador aparecerão aqui assim que forem publicadas.</p>
                </div>
              )}
            </section>
          </div>

          <aside className="installer-profile-sidebar">
            <section className="installer-profile-availability" id="disponibilidade">
              <p className="installer-profile-kicker">Disponibilidade</p>
              <h2>Próximos horários livres</h2>
              <p className="installer-profile-availability-copy">Consulte as datas informadas pelo profissional antes de enviar o pedido.</p>
              <div className="installer-profile-slots">
                {groupedSlotEntries.length ? (
                  groupedSlotEntries.slice(0, 4).map(([date, slots]) => (
                    <article key={date}>
                      <strong>{formatLongDate(`${date}T12:00:00`)}</strong>
                      <div>{slots.map((slot) => <span key={slot.id}>{slot.start_time} – {slot.end_time}</span>)}</div>
                    </article>
                  ))
                ) : installer.available_dates?.length ? (
                  installer.available_dates.slice(0, 4).map((date) => <span className="installer-profile-date-chip" key={date}>{formatLongDate(date)}</span>)
                ) : (
                  <div className="installer-profile-no-slots">Os horários ainda não foram informados. Você pode enviar o pedido para combinar a melhor data.</div>
                )}
              </div>
              <Link className="installer-profile-sidebar-action" to={requestPath}>{requestActionLabel}</Link>
            </section>

            <section className="installer-profile-security-card">
              <p>Confiança InstalaPro</p>
              <ul>
                <li>{installer.safety?.document_masked ? 'Documento cadastrado e conferido' : 'Dados profissionais cadastrados'}</li>
                <li>{installer.safety?.accepts_service_contract ? 'Pode formalizar o atendimento em contrato' : 'Detalhes combinados antes da execução'}</li>
                <li>{warrantyLabel}</li>
              </ul>
            </section>
          </aside>
        </section>

        <section className="installer-profile-section installer-profile-reviews" id="avaliacoes-instalador">
          <div className="installer-profile-section-heading installer-profile-section-heading--inline">
            <div><p>Avaliações</p><h2>O que os clientes contam</h2></div>
            {!isOwnInstallerProfile ? (
              <a
                className="installer-profile-text-link"
                href="#avaliar-instalador"
                onClick={(event) => requireClientLogin(event, `/installers/${installer.id}#avaliar-instalador`, 'Entre para avaliar este profissional.')}
              >
                Avaliar profissional
              </a>
            ) : null}
          </div>
          {reviews.length ? (
            <div className="installer-profile-review-grid">
              {reviews.map((review, index) => (
                <article key={`${review.reviewer_name}-${index}-${review.created_at}`}>
                  <div className="installer-profile-review-top"><strong>{review.reviewer_name}</strong><span>{review.rating}/5</span></div>
                  <p className="installer-profile-review-region">{review.reviewer_region || 'Região não informada'}</p>
                  <p>{review.comment || 'Avaliação enviada sem comentário adicional.'}</p>
                  <time>{formatShortDate(review.created_at)}</time>
                </article>
              ))}
            </div>
          ) : (
            <div className="installer-profile-review-empty">Ainda não há avaliações públicas. Os primeiros clientes poderão deixar um relato após a conclusão do serviço.</div>
          )}
        </section>

        <section className="installer-profile-bottom-grid">
          <section className="installer-profile-section installer-profile-review-form" id="avaliar-instalador">
            <div className="installer-profile-section-heading"><p>Avaliar</p><h2>Conte como foi sua experiência</h2></div>
            {!user ? (
              <div className="installer-profile-form-lock">
                <p>As avaliações são liberadas para clientes que concluíram um pedido na plataforma.</p>
                <Link className="installer-profile-primary-action" to={getClientLoginPath(`/installers/${installer.id}#avaliar-instalador`)}>Entrar para avaliar</Link>
              </div>
            ) : isOwnInstallerProfile ? (
              <div className="installer-profile-form-lock"><p>Você está vendo seu próprio perfil. Por segurança, não é possível enviar uma autoavaliação.</p></div>
            ) : (
              <form className="installer-profile-form" onSubmit={handleReviewSubmit}>
                <label><span>Seu nome</span><input name="reviewer_name" onChange={handleReviewChange} placeholder="Como você quer aparecer" required value={reviewForm.reviewer_name} /></label>
                <label><span>Sua região</span><input name="reviewer_region" onChange={handleReviewChange} placeholder="Cidade ou bairro" value={reviewForm.reviewer_region} /></label>
                <label><span>Nota</span><select name="rating" onChange={handleReviewChange} value={reviewForm.rating}><option value={5}>5 estrelas</option><option value={4}>4 estrelas</option><option value={3}>3 estrelas</option><option value={2}>2 estrelas</option><option value={1}>1 estrela</option></select></label>
                <label className="installer-profile-form-comment"><span>Comentário</span><textarea name="comment" onChange={handleReviewChange} placeholder="Conte como foi sua experiência" rows="4" value={reviewForm.comment} /></label>
                <button className="installer-profile-primary-action" disabled={sendingReview} type="submit">{sendingReview ? 'Enviando avaliação...' : 'Enviar avaliação'}</button>
              </form>
            )}
          </section>

          <aside className="installer-profile-marketplace">
            <p>Materiais recomendados</p>
            <h2>{marketplace?.title}</h2>
            <span>{marketplace?.description}</span>
            <div>{(marketplace?.highlights || []).slice(0, 3).map((highlight) => <i key={highlight}>{highlight}</i>)}</div>
            <a href={marketplace?.url || 'https://www.beminstalado.com.br'} rel="noreferrer" target="_blank">{marketplace?.cta_label || 'Visitar loja oficial'} →</a>
          </aside>
        </section>
      </div>

      <div className="installer-profile-mobile-cta"><Link to={requestPath}>{requestActionLabel}</Link></div>
    </main>
  );
}
