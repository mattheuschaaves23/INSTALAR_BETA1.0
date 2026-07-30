import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import ThemeToggle from '../Layout/ThemeToggle';
import api from '../../services/api';
import './ClientLanding.css';

const REQUEST_PATH = '/cliente';
const CLIENT_LOGIN_PATH = '/cliente/entrar';
const INSTALLER_LOGIN_PATH = '/instalador/entrar';
const STORE_CONTACT_URL =
  'https://api.whatsapp.com/send?phone=5548999816000&text=Ol%C3%A1%2C%20quero%20anunciar%20minha%20loja%20na%20InstalaPro.';

const fallbackStores = [
  {
    id: 'showcase-one',
    name: 'Sua loja aqui',
    description: 'Apresente sua coleção para clientes que já estão planejando a instalação.',
    image_url: '',
    cta_label: 'Anunciar minha loja',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-two',
    name: 'Vitrine InstalaPro',
    description: 'Sua marca em destaque no momento em que o projeto começa.',
    image_url: '',
    cta_label: 'Quero participar',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-three',
    name: 'Lojas recomendadas',
    description: 'Papel de parede, curadoria e atendimento especializado.',
    image_url: '',
    cta_label: 'Falar com a InstalaPro',
    link_url: STORE_CONTACT_URL,
  },
];

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`lp6-header${scrolled ? ' is-scrolled' : ''}`}>
      <Link aria-label="InstalaPro — página inicial" className="lp6-brand" to="/">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
      </Link>

      <nav aria-label="Navegação principal" className="lp6-nav">
        <a href="#lojas">Lojas</a>
        <a href="#como-funciona">Como funciona</a>
        <Link to={INSTALLER_LOGIN_PATH}>Sou instalador</Link>
      </nav>

      <div className="lp6-header-actions">
        <ThemeToggle />
        <Link className="lp6-login" to={CLIENT_LOGIN_PATH}>
          Entrar <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="lp6-hero-title" className="lp6-hero">
      <div className="lp6-hero-media">
        <img
          alt="Instalador finalizando uma parede elegante com papel de parede escuro"
          fetchPriority="high"
          src="/landing/hero-home-panoramico-v2.jpg"
        />
      </div>
      <div className="lp6-hero-gradient" aria-hidden="true" />
      <div className="lp6-hero-grain" aria-hidden="true" />

      <div className="lp6-hero-content">
        <p className="lp6-eyebrow"><span /> Instalação de papel de parede</p>
        <h1 id="lp6-hero-title">
          Papel de parede,
          <em>bem instalado.</em>
        </h1>
        <p className="lp6-hero-summary">
          Publique grátis. Instaladores da sua região demonstram interesse.
          <strong> Você escolhe quem chamar.</strong>
        </p>
        <div className="lp6-hero-actions">
          <Link className="lp6-primary-cta" to={REQUEST_PATH}>
            Criar pedido grátis <span aria-hidden="true">→</span>
          </Link>
          <a className="lp6-secondary-cta" href="#como-funciona">
            Ver como funciona
          </a>
        </div>

        <ul className="lp6-assurances" aria-label="Vantagens do serviço">
          <li><span>01</span> Sem custo para publicar</li>
          <li><span>02</span> Profissionais próximos</li>
          <li><span>03</span> A decisão é sua</li>
        </ul>
      </div>

      <a aria-label="Ir para lojas recomendadas" className="lp6-scroll-cue" href="#lojas">
        <span />
        Lojas recomendadas
      </a>
    </section>
  );
}

function StoreCard({ duplicate, store }) {
  const href = store.link_url || STORE_CONTACT_URL;
  const label = store.cta_label || 'Conhecer loja';

  return (
    <article className="lp6-store-card">
      <a
        aria-label={`${label}: ${store.name}`}
        href={href}
        rel="noreferrer"
        tabIndex={duplicate ? -1 : 0}
        target="_blank"
      >
        <div className={`lp6-store-visual${store.image_url ? '' : ' is-empty'}`}>
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
          <div className="lp6-store-monogram" aria-hidden="true">
            <span>{store.name?.slice(0, 1) || 'I'}</span>
          </div>
          <small>Seleção InstalaPro</small>
        </div>
        <div className="lp6-store-copy">
          <div>
            <h3>{store.name}</h3>
            <p>{store.description || 'Papel de parede e atendimento especializado.'}</p>
          </div>
          <span className="lp6-store-arrow" aria-hidden="true">↗</span>
        </div>
      </a>
    </article>
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
      (_, index) => ({ ...source[index % source.length], instance: index })
    );
  }, [stores]);

  const renderGroup = (duplicate = false) => (
    <div aria-hidden={duplicate} className="lp6-store-group">
      {items.map((store) => (
        <StoreCard
          duplicate={duplicate}
          key={`${duplicate ? 'copy' : 'main'}-${store.id}-${store.instance}`}
          store={store}
        />
      ))}
    </div>
  );

  return (
    <div
      aria-label="Carrossel automático de lojas recomendadas"
      className="lp6-carousel"
      role="region"
      style={{ '--lp6-carousel-duration': `${Math.max(56, items.length * 14)}s` }}
    >
      <div className="lp6-carousel-track">
        {renderGroup(false)}
        {renderGroup(true)}
      </div>
    </div>
  );
}

function Stores() {
  return (
    <section aria-labelledby="lp6-stores-title" className="lp6-stores" id="lojas">
      <div className="lp6-section-heading">
        <p><span>Curadoria</span> para o seu projeto</p>
        <h2 id="lp6-stores-title">Lojas recomendadas.</h2>
        <a href={STORE_CONTACT_URL} rel="noreferrer" target="_blank">
          Anunciar minha loja <span aria-hidden="true">↗</span>
        </a>
      </div>
      <StoreCarousel />
    </section>
  );
}

const processSteps = [
  {
    number: '01',
    title: 'Conte o que precisa.',
    text: 'Crie seu pedido com localização, medidas e detalhes do ambiente.',
  },
  {
    number: '02',
    title: 'Receba interessados.',
    text: 'Instaladores próximos encontram o projeto e demonstram interesse.',
  },
  {
    number: '03',
    title: 'Escolha quem chamar.',
    text: 'Compare os profissionais disponíveis e decida com quem conversar.',
  },
];

function Process() {
  return (
    <section aria-labelledby="lp6-process-title" className="lp6-process" id="como-funciona">
      <div className="lp6-process-intro">
        <p>Simples do início ao fim</p>
        <h2 id="lp6-process-title">
          Do pedido
          <em>à parede.</em>
        </h2>
      </div>

      <ol className="lp6-process-list">
        {processSteps.map((step) => (
          <li key={step.number}>
            <span>{step.number}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="lp6-final-cta">
        <p>Seu projeto pode começar agora.</p>
        <Link to={REQUEST_PATH}>
          Publicar meu pedido <span aria-hidden="true">→</span>
        </Link>
      </div>

      <footer className="lp6-footer">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
        <p>Conecta quem precisa com quem sabe instalar.</p>
        <nav aria-label="Links institucionais">
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Termos</Link>
          <a href="mailto:beminstaladohd@gmail.com">Contato</a>
        </nav>
        <span>© {new Date().getFullYear()} InstalaPro</span>
      </footer>
    </section>
  );
}

export default function ClientLanding() {
  return (
    <div className="lp6-page">
      <a className="lp6-skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Stores />
        <Process />
      </main>
    </div>
  );
}
