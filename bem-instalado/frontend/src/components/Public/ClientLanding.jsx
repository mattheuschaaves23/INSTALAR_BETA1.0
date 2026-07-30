import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import api from '../../services/api';
import './ClientLanding.css';

const REQUEST_PATH = '/cliente';
const CLIENT_LOGIN_PATH = '/cliente/entrar';
const INSTALLER_LOGIN_PATH = '/instalador/entrar';
const STORE_CONTACT_URL =
  'https://api.whatsapp.com/send?phone=5548999816000&text=Ol%C3%A1%2C%20quero%20anunciar%20minha%20loja%20na%20InstalaPro.';

const fallbackStores = [
  {
    id: 'showcase-modern',
    name: 'Sua loja aqui',
    description: 'Papel de parede para projetos que pedem personalidade.',
    image_url: '/landing/carousel-room-modern.jpg',
    cta_label: 'Anunciar minha loja',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-tropical',
    name: 'Novos estilos',
    description: 'Coleções para transformar qualquer ambiente.',
    image_url: '/landing/carousel-room-tropical.jpg',
    cta_label: 'Quero participar',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-bold',
    name: 'Paredes com presença',
    description: 'Curadoria, tendência e atendimento especializado.',
    image_url: '/landing/carousel-room-black-gold.jpg',
    cta_label: 'Falar com a InstalaPro',
    link_url: STORE_CONTACT_URL,
  },
];

const carouselColors = ['#ff5219', '#123c8c', '#f2c800', '#ea2c73', '#167c67'];

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`lp4-header${scrolled ? ' is-scrolled' : ''}`}>
      <Link aria-label="InstalaPro — início" className="lp4-brand" to="/">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
      </Link>

      <nav aria-label="Navegação principal" className="lp4-nav">
        <a href="#lojas">Lojas</a>
        <a href="#como-funciona">Como funciona</a>
      </nav>

      <div className="lp4-access">
        <Link className="lp4-installer-link" to={INSTALLER_LOGIN_PATH}>Sou instalador</Link>
        <Link className="lp4-login" to={CLIENT_LOGIN_PATH}>
          Entrar <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}

function StoreCarousel() {
  const [stores, setStores] = useState([]);

  useEffect(() => {
    let active = true;

    api.get('/public/recommended-stores')
      .then((response) => {
        if (!active) return;
        const nextStores = Array.isArray(response.data?.stores)
          ? response.data.stores.filter((store) => store?.is_active !== false).slice(0, 20)
          : [];
        setStores(nextStores);
      })
      .catch(() => {
        if (active) setStores([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => {
    const source = stores.length ? stores : fallbackStores;
    return Array.from(
      { length: Math.max(5, source.length) },
      (_, index) => ({
        ...source[index % source.length],
        instance: index,
        color: carouselColors[index % carouselColors.length],
      })
    );
  }, [stores]);

  const renderItems = (duplicate = false) => (
    <div aria-hidden={duplicate} className="lp4-store-group">
      {items.map((store) => (
        <article
          className="lp4-store-card"
          key={`${duplicate ? 'copy' : 'main'}-${store.id}-${store.instance}`}
          style={{ '--lp4-card-color': store.color }}
        >
          <a
            aria-label={`${store.cta_label || 'Conhecer loja'}: ${store.name}`}
            href={store.link_url || STORE_CONTACT_URL}
            rel="noreferrer"
            tabIndex={duplicate ? -1 : 0}
            target="_blank"
          >
            <div className="lp4-store-photo">
              {store.image_url ? (
                <img
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.parentElement.classList.add('is-empty');
                    event.currentTarget.remove();
                  }}
                  src={store.image_url}
                />
              ) : null}
              <span aria-hidden="true">{String(store.instance + 1).padStart(2, '0')}</span>
            </div>
            <div className="lp4-store-info">
              <p>{store.name}</p>
              <small>{store.description || 'Papel de parede e atendimento especializado.'}</small>
              <strong>{store.cta_label || 'Conhecer'} <i aria-hidden="true">↗</i></strong>
            </div>
          </a>
        </article>
      ))}
    </div>
  );

  return (
    <div
      aria-label="Carrossel de lojas de papel de parede recomendadas"
      className="lp4-marquee"
      role="region"
      style={{ '--lp4-carousel-speed': `${Math.max(52, items.length * 13)}s` }}
    >
      <div className="lp4-store-track">
        {renderItems(false)}
        {renderItems(true)}
      </div>
    </div>
  );
}

function HeroBlock() {
  return (
    <section className="lp4-hero">
      <div className="lp4-hero-copy">
        <div className="lp4-copy-orbit" aria-hidden="true"><span /></div>
        <p className="lp4-kicker"><span /> InstalaPro</p>
        <h1>
          Papel na parede.<br />
          <em>Sem dor de cabeça.</em>
        </h1>
        <p className="lp4-summary">
          Crie o pedido grátis. Instaladores perto de você se interessam. <strong>Você escolhe quem chamar.</strong>
        </p>
        <div className="lp4-hero-actions">
          <Link className="lp4-primary" to={REQUEST_PATH}>
            Pedir instalação <span aria-hidden="true">→</span>
          </Link>
          <Link className="lp4-secondary" to={INSTALLER_LOGIN_PATH}>
            Sou instalador
          </Link>
        </div>
      </div>

      <div className="lp4-hero-visual">
        <img
          alt="Sala moderna sendo transformada por um papel de parede colorido"
          fetchPriority="high"
          src="/landing/hero-instalapro-impacto-v3.jpg"
        />
        <span className="lp4-image-wash" aria-hidden="true" />
        <div className="lp4-local-badge">
          <i aria-hidden="true" />
          <span><strong>Profissionais</strong> da sua região</span>
        </div>
        <div className="lp4-choice-stamp" aria-hidden="true">
          Você<br /><strong>escolhe.</strong>
        </div>
      </div>

      <div className="lp4-hero-ticker" aria-hidden="true">
        <div>
          <span>Publique o pedido</span><i>✦</i>
          <span>Receba interessados</span><i>✦</i>
          <span>Escolha quem chamar</span><i>✦</i>
          <span>Publique o pedido</span><i>✦</i>
          <span>Receba interessados</span><i>✦</i>
          <span>Escolha quem chamar</span><i>✦</i>
        </div>
      </div>
    </section>
  );
}

function StoresBlock() {
  return (
    <section className="lp4-stores" id="lojas">
      <div className="lp4-store-heading">
        <div>
          <p>Seleção InstalaPro</p>
          <h2>Lojas que<br /><em>a gente recomenda.</em></h2>
        </div>
        <div className="lp4-store-heading-action">
          <span>Papel de parede para começar o seu projeto.</span>
          <a href={STORE_CONTACT_URL} rel="noreferrer" target="_blank">
            Anunciar minha loja <i aria-hidden="true">↗</i>
          </a>
        </div>
      </div>

      <StoreCarousel />
    </section>
  );
}

function ProcessBlock() {
  return (
    <section className="lp4-process" id="como-funciona">
      <div className="lp4-process-top">
        <p>É simples assim</p>
        <h2>
          Você pede.<br />
          Eles respondem.<br />
          <em>Você escolhe.</em>
        </h2>
        <Link to={REQUEST_PATH}>Criar meu pedido <span aria-hidden="true">→</span></Link>
      </div>

      <div className="lp4-process-body">
        <ol className="lp4-steps">
          <li>
            <span>1</span>
            <p><strong>Publique.</strong> Diga onde e o que precisa instalar.</p>
          </li>
          <li>
            <span>2</span>
            <p><strong>Receba.</strong> Profissionais da região demonstram interesse.</p>
          </li>
          <li>
            <span>3</span>
            <p><strong>Escolha.</strong> Compare e chame o profissional ideal.</p>
          </li>
        </ol>

        <div className="lp4-before-after">
          <div className="lp4-before">
            <img alt="Sala antes do papel de parede" loading="lazy" src="/landing/foto-before-alinhada.png" />
            <span>Antes</span>
          </div>
          <div className="lp4-after">
            <img alt="Sala depois da aplicação do papel de parede" loading="lazy" src="/landing/foto-after-alinhada.png" />
            <span>Depois</span>
          </div>
          <div className="lp4-reveal-handle" aria-hidden="true"><i>↔</i></div>
        </div>
      </div>

      <footer className="lp4-footer">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
        <p>Conecta quem quer transformar com quem sabe instalar.</p>
        <div>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Termos</Link>
          <a href="mailto:beminstaladohd@gmail.com">Contato</a>
        </div>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </section>
  );
}

export default function ClientLanding() {
  return (
    <div className="lp4-page">
      <a className="lp4-skip-link" href="#principal">Pular para o conteúdo</a>
      <Header />
      <main id="principal">
        <HeroBlock />
        <StoresBlock />
        <ProcessBlock />
      </main>
    </div>
  );
}
