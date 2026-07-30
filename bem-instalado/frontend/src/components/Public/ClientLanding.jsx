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
    name: 'Sua loja em destaque',
    description: 'Apresente sua coleção para clientes que já estão prontos para transformar um ambiente.',
    image_url: '/landing/carousel-room-modern.jpg',
    cta_label: 'Anunciar minha loja',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-tropical',
    name: 'Curadoria para cada estilo',
    description: 'Papéis de parede que conectam inspiração, produto e instalação profissional.',
    image_url: '/landing/carousel-room-tropical.jpg',
    cta_label: 'Quero participar',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-luxury',
    name: 'Marcas que transformam',
    description: 'Uma vitrine contínua para lojas de papel de parede selecionadas pela InstalaPro.',
    image_url: '/landing/carousel-room-black-gold.jpg',
    cta_label: 'Falar com a InstalaPro',
    link_url: STORE_CONTACT_URL,
  },
];

const steps = [
  {
    number: '01',
    title: 'Conte o que precisa',
    description: 'Crie seu pedido em poucos minutos e informe onde será a instalação.',
  },
  {
    number: '02',
    title: 'Receba interessados',
    description: 'Instaladores da sua região encontram o pedido e apresentam interesse.',
  },
  {
    number: '03',
    title: 'Escolha quem chamar',
    description: 'Compare os profissionais interessados e decida com quem conversar.',
  },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('lp3-menu-lock', menuOpen);
    return () => document.body.classList.remove('lp3-menu-lock');
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`lp3-header${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' has-menu' : ''}`}>
      <Link aria-label="InstalaPro — página inicial" className="lp3-brand" onClick={closeMenu} to="/">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
      </Link>

      <nav aria-label="Navegação principal" className="lp3-desktop-nav">
        <a href="#como-funciona">Como funciona</a>
        <a href="#lojas">Lojas recomendadas</a>
      </nav>

      <div className="lp3-header-actions">
        <Link className="lp3-login-link" to={INSTALLER_LOGIN_PATH}>
          Sou instalador
        </Link>
        <Link className="lp3-enter-button" to={CLIENT_LOGIN_PATH}>
          Entrar <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <button
        aria-controls="lp3-mobile-menu"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        className="lp3-menu-button"
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        <span />
        <span />
      </button>

      <div className="lp3-mobile-menu" id="lp3-mobile-menu">
        <nav aria-label="Navegação para celular">
          <a href="#como-funciona" onClick={closeMenu}>Como funciona <span>01</span></a>
          <a href="#lojas" onClick={closeMenu}>Lojas recomendadas <span>02</span></a>
          <Link onClick={closeMenu} to={REQUEST_PATH}>Criar meu pedido <span>↗</span></Link>
        </nav>
        <div className="lp3-mobile-access">
          <Link onClick={closeMenu} to={CLIENT_LOGIN_PATH}>Entrar como cliente</Link>
          <Link onClick={closeMenu} to={INSTALLER_LOGIN_PATH}>Entrar como instalador</Link>
        </div>
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

  const carouselStores = useMemo(() => {
    const source = stores.length ? stores : fallbackStores;
    const minimumItems = 5;
    return Array.from(
      { length: Math.max(minimumItems, source.length) },
      (_, index) => ({ ...source[index % source.length], instance: index })
    );
  }, [stores]);

  const renderGroup = (group) => (
    <div aria-hidden={group === 'duplicate'} className="lp3-store-group">
      {carouselStores.map((store) => (
        <article className="lp3-store-card" key={`${group}-${store.id}-${store.instance}`}>
          <a
            aria-label={`${store.cta_label || 'Visitar loja'}: ${store.name}`}
            href={store.link_url || STORE_CONTACT_URL}
            rel="noreferrer"
            tabIndex={group === 'duplicate' ? -1 : 0}
            target="_blank"
          >
            <div className="lp3-store-image">
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
              <span className="lp3-store-index" aria-hidden="true">
                {String(store.instance + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="lp3-store-copy">
              <div>
                <p>{store.name}</p>
                <span>{store.description || 'Papel de parede, curadoria e atendimento especializado.'}</span>
              </div>
              <i aria-hidden="true">↗</i>
            </div>
          </a>
        </article>
      ))}
    </div>
  );

  return (
    <div
      aria-label="Lojas de papel de parede recomendadas"
      className="lp3-store-marquee"
      role="region"
      style={{ '--lp3-marquee-duration': `${Math.max(46, carouselStores.length * 11)}s` }}
    >
      <div className="lp3-store-track">
        {renderGroup('original')}
        {renderGroup('duplicate')}
      </div>
    </div>
  );
}

function HeroBlock() {
  return (
    <section className="lp3-hero">
      <div className="lp3-hero-media" aria-hidden="true">
        <img
          alt=""
          fetchPriority="high"
          src="/landing/hero-instalapro-editorial-v2.jpg"
        />
        <span className="lp3-hero-vignette" />
        <span className="lp3-hero-paper-line" />
      </div>

      <div className="lp3-hero-orbit" aria-hidden="true">
        <span />
        <i />
      </div>

      <div className="lp3-hero-content">
        <p className="lp3-eyebrow">
          <span />
          Instalação de papel de parede
        </p>
        <h1>
          Sua parede.<br />
          <em>Do jeito certo.</em>
        </h1>
        <p className="lp3-hero-description">
          Publique o serviço, receba interessados da sua região e escolha o profissional ideal.
        </p>
        <div className="lp3-hero-actions">
          <Link className="lp3-main-cta" to={REQUEST_PATH}>
            Criar meu pedido
            <span aria-hidden="true">↗</span>
          </Link>
          <a className="lp3-text-link" href="#como-funciona">
            Ver como funciona
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>

      <div className="lp3-hero-proof" aria-label="Vantagens da InstalaPro">
        <span><strong>Grátis</strong> para criar o pedido</span>
        <span><strong>Local</strong> instaladores da região</span>
        <span><strong>Você decide</strong> quem chamar</span>
      </div>

      <div className="lp3-scroll-cue" aria-hidden="true">
        <span />
        Explore
      </div>
    </section>
  );
}

function HowItWorksBlock() {
  return (
    <section className="lp3-process" id="como-funciona">
      <div className="lp3-process-heading">
        <p className="lp3-section-number">01 — Como funciona</p>
        <h2>
          Do pedido à parede pronta,<br />
          <em>sem complicação.</em>
        </h2>
        <p>Três passos simples. Você mantém o controle do começo ao fim.</p>
      </div>

      <div className="lp3-process-grid">
        <ol className="lp3-steps">
          {steps.map((step, index) => (
            <li key={step.number} style={{ '--lp3-step-delay': `${index * 120}ms` }}>
              <span>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <i aria-hidden="true">→</i>
            </li>
          ))}
        </ol>

        <div className="lp3-transformation">
          <div className="lp3-before-layer">
            <img alt="Sala antes da aplicação do papel de parede" loading="lazy" src="/landing/foto-before-alinhada.png" />
            <span>Antes</span>
          </div>
          <div className="lp3-after-layer">
            <img alt="A mesma sala transformada com papel de parede" loading="lazy" src="/landing/foto-after-alinhada.png" />
            <span>Depois</span>
          </div>
          <div className="lp3-reveal-line" aria-hidden="true">
            <i>↔</i>
          </div>
          <p className="lp3-transformation-note">
            <strong>Uma parede muda tudo.</strong>
            Encontre quem sabe transformar a sua.
          </p>
        </div>
      </div>
    </section>
  );
}

function StoresBlock() {
  return (
    <section className="lp3-stores" id="lojas">
      <div className="lp3-stores-glow" aria-hidden="true" />
      <div className="lp3-stores-heading">
        <div>
          <p className="lp3-section-number">02 — Lojas recomendadas</p>
          <h2>Inspire. Escolha. <em>Transforme.</em></h2>
        </div>
        <div className="lp3-stores-intro">
          <p>Uma curadoria de lojas de papel de parede para o seu próximo ambiente.</p>
          <a href={STORE_CONTACT_URL} rel="noreferrer" target="_blank">
            Quero anunciar minha loja <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <StoreCarousel />

      <footer className="lp3-footer">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
        <p>Conecta quem quer transformar com quem sabe instalar.</p>
        <div>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Termos</Link>
          <a href="mailto:beminstaladohd@gmail.com">Contato</a>
        </div>
        <span>© {new Date().getFullYear()} InstalaPro</span>
      </footer>
    </section>
  );
}

export default function ClientLanding() {
  return (
    <div className="lp3-page">
      <a className="lp3-skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo">
        <HeroBlock />
        <HowItWorksBlock />
        <StoresBlock />
      </main>
    </div>
  );
}
