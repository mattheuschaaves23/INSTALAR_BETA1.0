import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DecoratingWallLoader from '../Layout/DecoratingWallLoader';
import './InstallerProfile.css';
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
  description: 'Materiais selecionados para deixar cada ambiente mais bonito.',
  url: 'https://www.beminstalado.com.br',
  cta_label: 'Conhecer a loja',
  whatsapp_url: 'https://api.whatsapp.com/send?phone=5548999816000',
  highlights: ['Papel de parede', 'Pagamento via Pix'],
};

function getInitials(name) {
  return (name || 'IP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getProfileHandle(name) {
  const normalized = String(name || 'instalapro')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);

  return `@${normalized || 'instalapro'}`;
}

function RatingStars({ value }) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(value || 0))));

  return (
    <span aria-label={`${rounded} de 5 estrelas`} className="social-installer-stars">
      {Array.from({ length: 5 }).map((_, index) => (
        <i aria-hidden="true" className={index < rounded ? 'is-filled' : ''} key={index}>★</i>
      ))}
    </span>
  );
}

function groupAvailabilitySlots(slots = []) {
  return slots.reduce((accumulator, slot) => {
    if (!slot.slot_date) {
      return accumulator;
    }

    accumulator[slot.slot_date] = accumulator[slot.slot_date] || [];
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

  const requestClientLogin = (event, nextPath, message) => {
    if (user) {
      return true;
    }

    event?.preventDefault();
    toast(message);
    navigate(getClientLoginPath(nextPath));
    return false;
  };

  if (!payload) {
    return <DecoratingWallLoader phrase="Abrindo o perfil deste profissional." />;
  }

  const { installer, reviews = [], marketplace: apiMarketplace } = payload;
  const marketplace = apiMarketplace || defaultMarketplace;
  const gallery = Array.isArray(installer.installation_gallery) ? installer.installation_gallery : [];
  const groupedSlotEntries = Object.entries(groupAvailabilitySlots(installer.availability_slots || []))
    .sort(([left], [right]) => left.localeCompare(right));
  const serviceRequestId = Number(new URLSearchParams(location.search).get('pedido')) || null;
  const requestPath = serviceRequestId ? '/cliente/pedido' : '/cliente';
  const requestActionLabel = serviceRequestId ? 'Voltar ao pedido' : 'Publicar pedido';
  const isOwnInstallerProfile = Boolean(user && Number(user.id) === Number(installer.id));
  const locationLabel =
    [installer.city, installer.state].filter(Boolean).join(' · ') ||
    installer.service_region ||
    'Região de atendimento a confirmar';
  const hasReviews = Number(installer.review_count || 0) > 0;
  const warrantyLabel = installer.safety?.provides_warranty
    ? `${installer.safety.warranty_days || 0} dias de garantia`
    : 'Garantia a combinar';
  const profileHandle = getProfileHandle(installer.display_name || installer.name);
  const profilePhoto = installer.installer_photo || installer.logo || null;

  return (
    <main className="social-installer-profile">
      <PageMetadata
        canonicalPath={`/installers/${installer.id}`}
        description={`${installer.display_name || installer.name} é instalador(a) de papel de parede${installer.city ? ` em ${installer.city}` : ''}. Veja trabalhos, avaliações e disponibilidade na InstalaPro.`}
        title={`${installer.display_name || installer.name} | Instalador de papel de parede`}
      />

      <nav aria-label="Navegação do perfil" className="social-installer-nav">
        <Link className="social-installer-nav-brand" to="/">Instala<span>Pro</span></Link>
        <Link className="social-installer-nav-back" to={requestPath}>← {serviceRequestId ? 'Meu pedido' : 'Encontrar instaladores'}</Link>
      </nav>

      <div className="social-installer-shell">
        <section className="social-installer-header">
          <div className="social-installer-cover" aria-hidden="true">
            {gallery[0] ? <img alt="" src={gallery[0]} /> : <div className="social-installer-cover-art" />}
            <div className="social-installer-cover-shade" />
            <span className="social-installer-cover-label">Perfil profissional</span>
          </div>

          <div className="social-installer-identity">
            <div className="social-installer-avatar-wrap">
              {profilePhoto ? (
                <img alt={`Foto de ${installer.display_name}`} className="social-installer-avatar" src={profilePhoto} />
              ) : (
                <div className="social-installer-avatar social-installer-avatar--initials">{getInitials(installer.display_name)}</div>
              )}
              {installer.certificate_verified || installer.safety?.document_masked ? <span aria-label="Perfil verificado" className="social-installer-verified">✓</span> : null}
            </div>

            <div className="social-installer-identity-copy">
              <div className="social-installer-name-line">
                <h1>{installer.display_name}</h1>
                {installer.featured_installer ? <span className="social-installer-featured">Destaque</span> : null}
              </div>
              <p>{profileHandle}</p>
              <span>{locationLabel}</span>
            </div>

            <div className="social-installer-header-actions">
              <Link className="social-installer-primary-button" to={requestPath}>{requestActionLabel}</Link>
              <a className="social-installer-secondary-button" href="#disponibilidade">Disponibilidade</a>
            </div>
          </div>

          <div className="social-installer-headline">
            <p>{installer.bio || 'Instalações cuidadosas, atendimento próximo e acabamento que valoriza cada ambiente.'}</p>
            <div className="social-installer-follow-row" aria-label="Resumo profissional">
              <div><strong>{installer.completed_jobs || 0}</strong><span>trabalhos</span></div>
              <div><strong>{installer.unique_clients_served || 0}</strong><span>clientes</span></div>
              <div><strong>{installer.review_count || 0}</strong><span>avaliações</span></div>
              <div className="social-installer-rating-summary"><RatingStars value={installer.average_rating} /><span>{hasReviews ? Number(installer.average_rating || 0).toFixed(1) : 'Novo perfil'}</span></div>
            </div>
          </div>
        </section>

        <div className="social-installer-layout">
          <section className="social-installer-feed">
            <article className="social-installer-card social-installer-intro-card">
              <div className="social-installer-card-heading">
                <div><p>Sobre o profissional</p><h2>Atendimento que começa pelo seu ambiente</h2></div>
                {installer.safety?.document_masked ? <span className="social-installer-verified-label">✓ Verificado</span> : null}
              </div>
              <p className="social-installer-intro-text">{installer.installation_method || 'Cada serviço é planejado antes da instalação para alinhar o material, o espaço e o acabamento esperado.'}</p>
              <div className="social-installer-highlight-list">
                <span>{installer.safety?.accepts_service_contract ? 'Contrato disponível' : 'Combinações registradas antes do serviço'}</span>
                <span>{warrantyLabel}</span>
                <span>{installer.service_hours || 'Horários a combinar'}</span>
              </div>
            </article>

            <article className="social-installer-card social-installer-work-card">
              <div className="social-installer-card-heading social-installer-card-heading--inline">
                <div><p>Trabalhos publicados</p><h2>Inspirações para o seu ambiente</h2></div>
                <span>{gallery.length ? `${gallery.length} fotos` : 'Em atualização'}</span>
              </div>
              {gallery.length ? (
                <div className="social-installer-work-grid">
                  {gallery.slice(0, 9).map((photo, index) => (
                    <figure key={`${index}-${photo}`}>
                      <img alt={`Trabalho realizado por ${installer.display_name} — foto ${index + 1}`} decoding="async" loading="lazy" src={photo} />
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="social-installer-empty-work">
                  <span>✦</span>
                  <strong>Novos trabalhos em breve</strong>
                  <p>Este profissional ainda está organizando o portfólio para publicar aqui.</p>
                </div>
              )}
            </article>

            <article className="social-installer-card social-installer-reviews" id="avaliacoes-instalador">
              <div className="social-installer-card-heading social-installer-card-heading--inline">
                <div><p>Recomendações</p><h2>O que os clientes dizem</h2></div>
                {!isOwnInstallerProfile ? (
                  <a
                    href="#avaliar-instalador"
                    onClick={(event) => requestClientLogin(event, `/installers/${installer.id}#avaliar-instalador`, 'Entre para avaliar este profissional.')}
                  >
                    Avaliar
                  </a>
                ) : null}
              </div>
              {reviews.length ? (
                <div className="social-installer-review-list">
                  {reviews.map((review, index) => (
                    <article key={`${review.reviewer_name}-${review.created_at}-${index}`}>
                      <div className="social-installer-review-avatar">{getInitials(review.reviewer_name)}</div>
                      <div className="social-installer-review-copy">
                        <div><strong>{review.reviewer_name}</strong><span>{review.reviewer_region || 'Cliente InstalaPro'}</span></div>
                        <RatingStars value={review.rating} />
                        <p>{review.comment || 'Cliente recomendou este profissional.'}</p>
                        <time>{formatShortDate(review.created_at)}</time>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="social-installer-empty-reviews">As recomendações aparecerão aqui depois das primeiras instalações concluídas.</div>
              )}
            </article>

            <article className="social-installer-card social-installer-review-form" id="avaliar-instalador">
              <div className="social-installer-card-heading"><p>Sua experiência</p><h2>Deixe uma recomendação</h2></div>
              {!user ? (
                <div className="social-installer-review-lock">
                  <p>As avaliações são liberadas para clientes que concluíram um pedido pela plataforma.</p>
                  <Link className="social-installer-primary-button" to={getClientLoginPath(`/installers/${installer.id}#avaliar-instalador`)}>Entrar para avaliar</Link>
                </div>
              ) : isOwnInstallerProfile ? (
                <div className="social-installer-review-lock"><p>Este é o seu perfil. Autoavaliações não são permitidas.</p></div>
              ) : (
                <form className="social-installer-review-fields" onSubmit={handleReviewSubmit}>
                  <label><span>Seu nome</span><input name="reviewer_name" onChange={handleReviewChange} placeholder="Como você quer aparecer" required value={reviewForm.reviewer_name} /></label>
                  <label><span>Sua região</span><input name="reviewer_region" onChange={handleReviewChange} placeholder="Cidade ou bairro" value={reviewForm.reviewer_region} /></label>
                  <label><span>Nota</span><select name="rating" onChange={handleReviewChange} value={reviewForm.rating}><option value={5}>5 estrelas</option><option value={4}>4 estrelas</option><option value={3}>3 estrelas</option><option value={2}>2 estrelas</option><option value={1}>1 estrela</option></select></label>
                  <label className="social-installer-review-comment"><span>Comentário</span><textarea name="comment" onChange={handleReviewChange} placeholder="Conte como foi sua experiência" rows="4" value={reviewForm.comment} /></label>
                  <button className="social-installer-primary-button" disabled={sendingReview} type="submit">{sendingReview ? 'Enviando...' : 'Publicar recomendação'}</button>
                </form>
              )}
            </article>
          </section>

          <aside className="social-installer-aside">
            <article className="social-installer-side-card">
              <p>Informações</p>
              <dl>
                <div><dt>Atende em</dt><dd>{installer.service_region || locationLabel}</dd></div>
                <div><dt>Dias disponíveis</dt><dd>{formatInstallationDays(installer.installation_days)}</dd></div>
                <div><dt>Documento</dt><dd>{installer.safety?.document_masked || 'Cadastro profissional'}</dd></div>
              </dl>
              {installer.certificate_file ? <a href={installer.certificate_file} rel="noreferrer" target="_blank">Ver certificado ↗</a> : null}
            </article>

            <article className="social-installer-side-card social-installer-availability" id="disponibilidade">
              <p>Agenda</p>
              <h2>Próximos horários</h2>
              {groupedSlotEntries.length ? (
                <div className="social-installer-slot-list">
                  {groupedSlotEntries.slice(0, 4).map(([date, slots]) => (
                    <div key={date}>
                      <strong>{formatLongDate(`${date}T12:00:00`)}</strong>
                      <span>{slots.map((slot) => `${slot.start_time} – ${slot.end_time}`).join(' · ')}</span>
                    </div>
                  ))}
                </div>
              ) : installer.available_dates?.length ? (
                <div className="social-installer-date-list">{installer.available_dates.slice(0, 4).map((date) => <span key={date}>{formatLongDate(date)}</span>)}</div>
              ) : (
                <div className="social-installer-no-slots">Os próximos horários ainda serão informados. Envie o pedido para combinar uma data.</div>
              )}
              <Link className="social-installer-side-action" to={requestPath}>{requestActionLabel}</Link>
            </article>

            <article className="social-installer-side-card social-installer-prices">
              <p>Valores de referência</p>
              <div><span>Visita técnica</span><strong>{formatCurrency(installer.base_service_cost)}</strong></div>
              <div><span>Deslocamento</span><strong>{formatCurrency(installer.travel_fee)}</strong></div>
              <div><span>Por rolo</span><strong>{formatCurrency(installer.default_price_per_roll)}</strong></div>
              <div><span>Remoção</span><strong>{formatCurrency(installer.default_removal_price)}</strong></div>
              <small>O valor final é confirmado no orçamento.</small>
            </article>

            <article className="social-installer-store-card">
              <span>Parceiro recomendado</span>
              <h2>{marketplace.title}</h2>
              <p>{marketplace.description}</p>
              <div>{(marketplace.highlights || []).slice(0, 2).map((highlight) => <i key={highlight}>{highlight}</i>)}</div>
              <a href={marketplace.url || 'https://www.beminstalado.com.br'} rel="noreferrer" target="_blank">{marketplace.cta_label || 'Conhecer a loja'} →</a>
              {marketplace.whatsapp_url ? <a className="social-installer-store-whatsapp" href={marketplace.whatsapp_url} rel="noreferrer" target="_blank">Falar com a loja</a> : null}
            </article>
          </aside>
        </div>
      </div>

      <div className="social-installer-mobile-action"><Link to={requestPath}>{requestActionLabel}</Link></div>
    </main>
  );
}
