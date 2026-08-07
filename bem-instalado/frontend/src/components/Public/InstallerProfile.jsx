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

const emptyReviewForm = { reviewer_name: '', reviewer_region: '', rating: 5, comment: '' };

const defaultMarketplace = {
  title: 'Loja Oficial InstalaPro',
  description: 'Materiais para deixar o seu ambiente ainda mais bonito.',
  url: 'https://www.beminstalado.com.br',
  cta_label: 'Conhecer a loja',
  highlights: ['Papel de parede', 'Pagamento via Pix'],
};

function getInitials(name) {
  return (name || 'IP').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function getHandle(name) {
  const handle = String(name || 'instalapro')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
  return `@${handle || 'instalapro'}`;
}

function RatingStars({ value }) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(value || 0))));
  return (
    <span aria-label={`${rounded} de 5 estrelas`} className="ig-profile-stars">
      {Array.from({ length: 5 }).map((_, index) => <i aria-hidden="true" className={index < rounded ? 'is-filled' : ''} key={index}>★</i>)}
    </span>
  );
}

function groupAvailabilitySlots(slots = []) {
  return slots.reduce((all, slot) => {
    if (!slot.slot_date) return all;
    all[slot.slot_date] = all[slot.slot_date] || [];
    all[slot.slot_date].push(slot);
    return all;
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
    setReviewForm((current) => ({ ...current, [name]: name === 'rating' ? Number(value) : value }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    const reviewerName = reviewForm.reviewer_name.trim();

    if (!user) {
      toast('Entre para avaliar o instalador escolhido.');
      navigate(getClientLoginPath(`/installers/${id}#avaliar-instalador`));
      return;
    }

    if (Number(user.id) === Number(id)) {
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

  const requireClientLogin = (event) => {
    if (user) return;
    event.preventDefault();
    toast('Entre para avaliar este profissional.');
    navigate(getClientLoginPath(`/installers/${id}#avaliar-instalador`));
  };

  if (!payload) return <DecoratingWallLoader phrase="Abrindo o perfil deste profissional." />;

  const { installer, reviews = [], marketplace: apiMarketplace } = payload;
  const marketplace = apiMarketplace || defaultMarketplace;
  const gallery = Array.isArray(installer.installation_gallery) ? installer.installation_gallery : [];
  const slots = Object.entries(groupAvailabilitySlots(installer.availability_slots || [])).sort(([a], [b]) => a.localeCompare(b));
  const serviceRequestId = Number(new URLSearchParams(location.search).get('pedido')) || null;
  const requestPath = serviceRequestId ? '/cliente/pedido' : '/cliente';
  const requestLabel = serviceRequestId ? 'Voltar ao pedido' : 'Publicar pedido';
  const isOwnProfile = Boolean(user && Number(user.id) === Number(installer.id));
  const profilePhoto = installer.installer_photo || installer.logo;
  const locationLabel = [installer.city, installer.state].filter(Boolean).join(' · ') || installer.service_region || 'Região a confirmar';
  const warrantyLabel = installer.safety?.provides_warranty ? `${installer.safety.warranty_days || 0} dias de garantia` : 'Garantia a combinar';
  const hasReviews = Number(installer.review_count || 0) > 0;

  return (
    <main className="ig-installer-profile">
      <PageMetadata
        canonicalPath={`/installers/${installer.id}`}
        description={`${installer.display_name || installer.name} é instalador(a) de papel de parede${installer.city ? ` em ${installer.city}` : ''}. Veja trabalhos, avaliações e disponibilidade na InstalaPro.`}
        title={`${installer.display_name || installer.name} | Instalador de papel de parede`}
      />

      <nav aria-label="Navegação do perfil" className="ig-profile-topbar">
        <Link className="ig-profile-brand" to="/">Instala<span>Pro</span></Link>
        <Link className="ig-profile-back" to={requestPath}>← {serviceRequestId ? 'Meu pedido' : 'Encontrar instaladores'}</Link>
      </nav>

      <div className="ig-profile-shell">
        <header className="ig-profile-header">
          <div className="ig-profile-avatar-ring">
            <div className="ig-profile-avatar-frame">
              {profilePhoto ? <img alt={`Foto de ${installer.display_name}`} src={profilePhoto} /> : <span>{getInitials(installer.display_name)}</span>}
            </div>
          </div>

          <div className="ig-profile-summary">
            <div className="ig-profile-title-row">
              <h1>{installer.display_name}</h1>
              {installer.certificate_verified || installer.safety?.document_masked ? <span aria-label="Perfil verificado" className="ig-profile-verified">✓</span> : null}
              <Link className="ig-profile-action" to={requestPath}>{requestLabel}</Link>
            </div>

            <div className="ig-profile-stats" aria-label="Estatísticas do profissional">
              <a href="#trabalhos"><strong>{gallery.length}</strong><span>publicações</span></a>
              <a href="#avaliacoes"><strong>{installer.review_count || 0}</strong><span>avaliações</span></a>
              <a href="#informacoes"><strong>{installer.unique_clients_served || 0}</strong><span>clientes</span></a>
            </div>

            <div className="ig-profile-bio">
              <strong>{getHandle(installer.display_name || installer.name)}</strong>
              <p>{installer.bio || 'Instalações cuidadosas para transformar o seu ambiente com acabamento profissional.'}</p>
              <span>⌖ {locationLabel}</span>
            </div>
          </div>
        </header>

        <section aria-label="Destaques do perfil" className="ig-profile-highlights">
          <a href="#trabalhos"><span className="ig-highlight-icon">▦</span><strong>Trabalhos</strong></a>
          <a href="#agenda"><span className="ig-highlight-icon">◷</span><strong>Agenda</strong></a>
          <a href="#informacoes"><span className="ig-highlight-icon">✓</span><strong>Verificado</strong></a>
          <a href="#avaliacoes"><span className="ig-highlight-icon">★</span><strong>Avaliações</strong></a>
        </section>

        <nav aria-label="Conteúdos do perfil" className="ig-profile-tabs">
          <a href="#trabalhos">▦ <span>Trabalhos</span></a>
          <a href="#informacoes">◫ <span>Informações</span></a>
          <a href="#avaliacoes">☆ <span>Avaliações</span></a>
        </nav>

        <section className="ig-profile-block ig-profile-posts" id="trabalhos">
          <div className="ig-profile-block-heading"><div><p>Publicações</p><h2>Trabalhos realizados</h2></div><span>{gallery.length ? `${gallery.length} fotos` : 'Em atualização'}</span></div>
          {gallery.length ? (
            <div className="ig-profile-grid">
              {gallery.slice(0, 12).map((photo, index) => <figure key={`${photo}-${index}`}><img alt={`Trabalho ${index + 1} de ${installer.display_name}`} decoding="async" loading="lazy" src={photo} /></figure>)}
            </div>
          ) : (
            <div className="ig-profile-empty-posts"><span>▦</span><strong>Ainda não há publicações</strong><p>Os trabalhos deste profissional aparecerão aqui quando forem adicionados ao portfólio.</p></div>
          )}
        </section>

        <section className="ig-profile-info-grid" id="informacoes">
          <article className="ig-profile-block ig-profile-about-block">
            <div className="ig-profile-block-heading"><div><p>Sobre</p><h2>Atendimento</h2></div></div>
            <p>{installer.installation_method || 'O ambiente é analisado antes da instalação para orientar o melhor material e acabamento.'}</p>
            <div className="ig-profile-tags">
              <span>{installer.safety?.accepts_service_contract ? 'Contrato disponível' : 'Combinações registradas'}</span>
              <span>{warrantyLabel}</span>
              <span>{installer.service_hours || 'Horários a combinar'}</span>
            </div>
          </article>

          <article className="ig-profile-block ig-profile-data-block">
            <div className="ig-profile-block-heading"><div><p>Informações</p><h2>Detalhes do perfil</h2></div></div>
            <dl>
              <div><dt>Atende em</dt><dd>{installer.service_region || locationLabel}</dd></div>
              <div><dt>Dias de instalação</dt><dd>{formatInstallationDays(installer.installation_days)}</dd></div>
              <div><dt>Documento</dt><dd>{installer.safety?.document_masked || 'Cadastro profissional'}</dd></div>
            </dl>
            {installer.certificate_file ? <a href={installer.certificate_file} rel="noreferrer" target="_blank">Ver certificado ↗</a> : null}
          </article>

          <article className="ig-profile-block ig-profile-price-block">
            <div className="ig-profile-block-heading"><div><p>Referência</p><h2>Valores</h2></div></div>
            <div><span>Visita técnica</span><strong>{formatCurrency(installer.base_service_cost)}</strong></div>
            <div><span>Deslocamento</span><strong>{formatCurrency(installer.travel_fee)}</strong></div>
            <div><span>Instalação por rolo</span><strong>{formatCurrency(installer.default_price_per_roll)}</strong></div>
            <div><span>Remoção</span><strong>{formatCurrency(installer.default_removal_price)}</strong></div>
            <small>O orçamento final considera o seu ambiente.</small>
          </article>
        </section>

        <section className="ig-profile-block ig-profile-agenda" id="agenda">
          <div className="ig-profile-block-heading"><div><p>Agenda</p><h2>Próximos horários livres</h2></div><Link to={requestPath}>{requestLabel}</Link></div>
          {slots.length ? (
            <div className="ig-profile-slot-grid">
              {slots.slice(0, 4).map(([date, dateSlots]) => <article key={date}><strong>{formatLongDate(`${date}T12:00:00`)}</strong><span>{dateSlots.map((slot) => `${slot.start_time} – ${slot.end_time}`).join(' · ')}</span></article>)}
            </div>
          ) : installer.available_dates?.length ? (
            <div className="ig-profile-date-grid">{installer.available_dates.slice(0, 4).map((date) => <span key={date}>{formatLongDate(date)}</span>)}</div>
          ) : (
            <p className="ig-profile-no-slots">Os horários ainda serão informados. Você pode enviar o pedido para combinar a melhor data.</p>
          )}
        </section>

        <section className="ig-profile-block ig-profile-reviews" id="avaliacoes">
          <div className="ig-profile-block-heading"><div><p>Recomendações</p><h2>O que os clientes dizem</h2></div>{!isOwnProfile ? <a href="#avaliar-instalador" onClick={requireClientLogin}>Escrever avaliação</a> : null}</div>
          {reviews.length ? (
            <div className="ig-profile-review-list">
              {reviews.map((review, index) => (
                <article key={`${review.reviewer_name}-${review.created_at}-${index}`}>
                  <span className="ig-profile-review-avatar">{getInitials(review.reviewer_name)}</span>
                  <div><strong>{review.reviewer_name}</strong><small>{review.reviewer_region || 'Cliente InstalaPro'}</small><RatingStars value={review.rating} /><p>{review.comment || 'Cliente recomendou este profissional.'}</p><time>{formatShortDate(review.created_at)}</time></div>
                </article>
              ))}
            </div>
          ) : <p className="ig-profile-no-reviews">As recomendações aparecerão aqui depois das primeiras instalações concluídas.</p>}
        </section>

        <section className="ig-profile-block ig-profile-review-form" id="avaliar-instalador">
          <div className="ig-profile-block-heading"><div><p>Sua experiência</p><h2>Escreva uma recomendação</h2></div></div>
          {!user ? (
            <div className="ig-profile-review-locked"><p>As avaliações são liberadas para clientes que concluíram um pedido pela plataforma.</p><Link className="ig-profile-action" to={getClientLoginPath(`/installers/${installer.id}#avaliar-instalador`)}>Entrar para avaliar</Link></div>
          ) : isOwnProfile ? (
            <p className="ig-profile-no-reviews">Este é o seu perfil. Autoavaliações não são permitidas.</p>
          ) : (
            <form className="ig-profile-form" onSubmit={handleReviewSubmit}>
              <label><span>Seu nome</span><input name="reviewer_name" onChange={handleReviewChange} placeholder="Como você quer aparecer" required value={reviewForm.reviewer_name} /></label>
              <label><span>Sua região</span><input name="reviewer_region" onChange={handleReviewChange} placeholder="Cidade ou bairro" value={reviewForm.reviewer_region} /></label>
              <label><span>Nota</span><select name="rating" onChange={handleReviewChange} value={reviewForm.rating}><option value={5}>5 estrelas</option><option value={4}>4 estrelas</option><option value={3}>3 estrelas</option><option value={2}>2 estrelas</option><option value={1}>1 estrela</option></select></label>
              <label className="ig-profile-form-comment"><span>Comentário</span><textarea name="comment" onChange={handleReviewChange} placeholder="Conte como foi sua experiência" rows="4" value={reviewForm.comment} /></label>
              <button className="ig-profile-action" disabled={sendingReview} type="submit">{sendingReview ? 'Enviando...' : 'Publicar avaliação'}</button>
            </form>
          )}
        </section>

        <aside className="ig-profile-store">
          <div><span>Parceiro recomendado</span><h2>{marketplace.title}</h2><p>{marketplace.description}</p><small>{(marketplace.highlights || []).slice(0, 2).join(' · ')}</small></div>
          <a href={marketplace.url || 'https://www.beminstalado.com.br'} rel="noreferrer" target="_blank">{marketplace.cta_label || 'Conhecer a loja'} →</a>
        </aside>
      </div>

      <div className="ig-profile-mobile-action"><Link to={requestPath}>{requestLabel}</Link></div>
    </main>
  );
}
