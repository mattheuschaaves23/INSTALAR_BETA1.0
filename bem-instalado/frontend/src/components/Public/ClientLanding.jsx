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
    id: 'showcase-one',
    name: 'Sua loja aqui',
    description: 'Sua coleção perto de quem já procura instalação.',
    image_url: '',
    cta_label: 'Anunciar minha loja',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-two',
    name: 'Vitrine InstalaPro',
    description: 'Destaque sua marca no momento certo do projeto.',
    image_url: '',
    cta_label: 'Quero participar',
    link_url: STORE_CONTACT_URL,
  },
  {
    id: 'showcase-three',
    name: 'Lojas recomendadas',
    description: 'Curadoria de papel de parede e atendimento especializado.',
    image_url: '',
    cta_label: 'Falar com a InstalaPro',
    link_url: STORE_CONTACT_URL,
  },
];

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`lp5-header${scrolled ? ' is-scrolled' : ''}`}>
      <Link aria-label="InstalaPro — início" className="lp5-brand" to="/">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
      </Link>

      <nav aria-label="Navegação principal" className="lp5-nav">
        <a href="#lojas">Lojas recomendadas</a>
        <a href="#como-funciona">Como funciona</a>
      </nav>

      <div className="lp5-access">
        <Link className="lp5-installer-link" to={INSTALLER_LOGIN_PATH}>Sou instalador</Link>
        <Link className="lp5-login" to={CLIENT_LOGIN_PATH}>
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
      (_, index) => ({ ...source[index % source.length], instance: index })
    );
  }, [stores]);

  const renderItems = (duplicate = false) => (
    <div aria-hidden={duplicate} className="lp5-store-group">
      {items.map((store) => (
        <article className="lp5-store-card" key={`${duplicate ? 'copy' : 'main'}-${store.id}-${store.instance}`}>
          <a
            aria-label={`${store.cta_label || 'Conhecer loja'}: ${store.name}`}
            href={store.link_url || STORE_CONTACT_URL}
            rel="noreferrer"
            tabIndex={duplicate ? -1 : 0}
            target="_blank"
          >
            <div className={`lp5-store-photo${store.image_url ? '' : ' is-empty'}`}>
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
              <i aria-hidden="true">IP</i>
            </div>
            <div className="lp5-store-info">
              <div>
                <p>{store.name}</p>
                <small>{store.description || 'Papel de parede e atendimento especializado.'}</small>
              </div>
              <strong aria-hidden="true">↗</strong>
            </div>
          </a>
        </article>
      ))}
    </div>
  );

  return (
    <div
      aria-label="Carrossel de lojas de papel de parede recomendadas"
      className="lp5-marquee"
      role="region"
      style={{ '--lp5-carousel-speed': `${Math.max(54, items.length * 14)}s` }}
    >
      <div className="lp5-store-track">
        {renderItems(false)}
        {renderItems(true)}
      </div>
    </div>
  );
}

function WallpaperMotion() {
  return (
    <figure className="lp5-wall-motion">
      <img
        alt="Profissional aplicando papel de parede preto com detalhes dourados"
        fetchPriority="high"
        src="/landing/hero-instalacao-preto-dourado-v1.jpg"
      />
      <div className="lp5-photo-shade" aria-hidden="true" />
      <div className="lp5-photo-sweep" aria-hidden="true" />
      <figcaption>
        <strong>Aplicação profissional.</strong>
        <span>Precisa, limpa e bem-acabada.</span>
      </figcaption>
      <div className="lp5-motion-number" aria-hidden="true">01</div>
    </figure>
  );
}

function HeroBlock() {
  return (
    <section className="lp5-hero">
      <div className="lp5-hero-rings" aria-hidden="true"><span /><i /></div>

      <div className="lp5-hero-copy">
        <p className="lp5-kicker"><span /> Instalação de papel de parede</p>
        <h1>
          Papel na parede.<br />
          <em>Sem dor de cabeça.</em>
        </h1>
        <p className="lp5-summary">
          Publique grátis. Profissionais da região se interessam. <strong>Você escolhe.</strong>
        </p>
        <div className="lp5-hero-actions">
          <Link className="lp5-primary" to={REQUEST_PATH}>
            Criar meu pedido <span aria-hidden="true">→</span>
          </Link>
          <a className="lp5-text-link" href="#como-funciona">Como funciona <span>↓</span></a>
        </div>
      </div>

      <WallpaperMotion />

      <div className="lp5-hero-ticker" aria-hidden="true">
        <div>
          <span>Publique</span><i>✦</i>
          <span>Receba interessados</span><i>✦</i>
          <span>Escolha</span><i>✦</i>
          <span>Publique</span><i>✦</i>
          <span>Receba interessados</span><i>✦</i>
          <span>Escolha</span><i>✦</i>
        </div>
      </div>
    </section>
  );
}

function StoresBlock() {
  return (
    <section className="lp5-stores" id="lojas">
      <div className="lp5-store-heading">
        <div>
          <p>Escolhas InstalaPro</p>
          <h2>Lojas <em>recomendadas.</em></h2>
        </div>
        <a href={STORE_CONTACT_URL} rel="noreferrer" target="_blank">
          Anunciar minha loja <span aria-hidden="true">↗</span>
        </a>
      </div>
      <StoreCarousel />
    </section>
  );
}

function ProcessBlock() {
  return (
    <section className="lp5-process" id="como-funciona">
      <div className="lp5-process-heading">
        <p>Direto ao ponto</p>
        <h2>Você pede.<br /><em>Você escolhe.</em></h2>
        <Link to={REQUEST_PATH}>Começar agora <span aria-hidden="true">→</span></Link>
      </div>

      <div className="lp5-flow-shell">
        <ol className="lp5-flow">
          <li>
            <span>01</span>
            <div><strong>Publique</strong><small>o que precisa instalar.</small></div>
          </li>
          <li>
            <span>02</span>
            <div><strong>Receba</strong><small>interessados da região.</small></div>
          </li>
          <li>
            <span>03</span>
            <div><strong>Escolha</strong><small>quem você quer chamar.</small></div>
          </li>
        </ol>
        <div className="lp5-flow-line" aria-hidden="true"><i /></div>
      </div>

      <footer className="lp5-footer">
        <img alt="InstalaPro" src="/brand/instalapro-logo-transparent.png" />
        <p>Conecta quem precisa com quem sabe instalar.</p>
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
    <div className="lp5-page">
      <a className="lp5-skip-link" href="#principal">Pular para o conteúdo</a>
      <Header />
      <main id="principal">
        <HeroBlock />
        <StoresBlock />
        <ProcessBlock />
      </main>
    </div>
  );
}
