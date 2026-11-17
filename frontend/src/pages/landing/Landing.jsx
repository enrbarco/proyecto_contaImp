import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import landingCss from './landing.css?inline';
import logo from '../../assets/logo.webp';
import hero from '../../assets/hero.jpg';
import cta from '../../assets/cta.jpg';
import { Icon, SERVICES, VALUES } from './content.jsx';

const CONTACT_EMAIL = 'info@contaimp.com';
const SECTIONS = [['inicio', 'Inicio'], ['valores', 'Valores'], ['servicios', 'Servicios'], ['contacto', 'Contacto']];

/**
 * Portada pública de CONTAIMP. Sus estilos se cargan solo mientras está visible
 * para que no se mezclen con los de la aplicación.
 */
export default function Landing({ onLogin }) {
  const navRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState('inicio');
  const [status, setStatus] = useState('');

  useLayoutEffect(() => {
    const style = document.createElement('style');
    style.textContent = landingCss;
    document.head.appendChild(style);
    document.documentElement.classList.add('js');
    return () => {
      style.remove();
      document.documentElement.classList.remove('js');
    };
  }, []);

  // La barra se oculta al bajar y reaparece al subir.
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setHidden(y > last && y > 240);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Enlace activo según la sección visible y aparición suave de los bloques.
  useEffect(() => {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) spy.observe(el); });

    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          reveal.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));

    return () => {
      spy.disconnect();
      reveal.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Abre el programa de correo con el mensaje ya escrito.
  function sendContact(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const subject = `Consulta desde la web - ${data.get('nombre')}`;
    const body = `${data.get('mensaje')}\n\n${data.get('nombre')}\n${data.get('correo')}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('Se abrió tu programa de correo con el mensaje listo para enviar.');
  }

  return (
    <div className={`landing${menuOpen ? ' nav-open' : ''}`}>
      <a className="skip" href="#inicio">Saltar al contenido principal</a>

      <header className={`nav${hidden && !menuOpen ? ' is-hidden' : ''}`} ref={navRef}>
        <div className="nav__bar">
          <a className="nav__logo" href="#inicio" aria-label="CONTAIMP, inicio"><img src={logo} alt="CONTAIMP" width="120" height="51" /></a>
          <nav className="nav__links" id="menu" aria-label="Principal">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={active === id ? 'active' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </nav>
          <button type="button" className="nav__login" onClick={onLogin}>Ingresar</button>
          <button
            type="button"
            className="nav__toggle"
            aria-expanded={menuOpen}
            aria-controls="menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span /><span />
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <img className="hero__img" src={hero} alt="" fetchPriority="high" />
          <div className="hero__shade" />
          <div className="wrap hero__content">
            <h1 className="reveal">Bienvenido a CONTAIMP</h1>
            <p className="reveal">Transformamos la contabilidad en una herramienta estratégica. Hacemos más que cumplir con obligaciones fiscales: ayudamos a las empresas a crecer y ser rentables.</p>
            <div className="hero__actions reveal">
              <a className="btn btn--light" href="#servicios">Ver servicios</a>
              <button type="button" className="btn btn--ghost" onClick={onLogin}>Acceso a clientes</button>
            </div>
          </div>
        </section>

        <section className="section" id="valores">
          <div className="wrap">
            <h2 className="eyebrow reveal">Conócenos</h2>
            <div className="grid grid--3">
              {VALUES.map((v) => (
                <article className="card reveal" key={v.title}>
                  <div className="icon"><Icon name={v.icon} /></div>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--tint" id="servicios">
          <div className="wrap">
            <h2 className="eyebrow reveal">Nuestros servicios</h2>
            <div className="grid grid--3">
              {SERVICES.map((s) => (
                <article className="card card--service reveal" key={s.title}>
                  <div className="icon"><Icon name={s.icon} /></div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta" id="cta">
          <img className="cta__img" src={cta} alt="" loading="lazy" />
          <div className="cta__shade" />
          <div className="wrap cta__content">
            <h2 className="reveal">Transforma tus números en decisiones estratégicas</h2>
            <p className="reveal">Confía en CONTAIMP para un crecimiento sostenible</p>
          </div>
        </section>

        <section className="section" id="contacto">
          <div className="wrap contact">
            <div className="contact__info">
              <h2 className="reveal">¡Contáctanos!</h2>
              <p className="reveal">Si tienes alguna consulta sobre nuestros servicios contables, financieros o tributarios, escríbenos. Nuestro equipo está listo para ofrecerte soluciones personalizadas.</p>
              <ul className="facts reveal">
                <li><span className="icon icon--sm"><Icon name="pin" /></span><div><h3>País</h3><p>Ecuador</p></div></li>
                <li><span className="icon icon--sm"><Icon name="phone" /></span><div><h3>Teléfono</h3><p><a href="tel:+593969990990">+593 969 990 990</a></p></div></li>
                <li><span className="icon icon--sm"><Icon name="mail" /></span><div><h3>Correo</h3><p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></div></li>
              </ul>
            </div>

            <div className="contact__form reveal">
              <h3>Escríbenos</h3>
              <form id="contact-form" onSubmit={sendContact}>
                <label className="field"><span>Nombre completo</span><input type="text" name="nombre" placeholder="Nombre completo" autoComplete="name" required /></label>
                <label className="field"><span>Correo electrónico</span><input type="email" name="correo" placeholder="Correo electrónico" autoComplete="email" required /></label>
                <label className="field"><span>¿Cómo podemos ayudarte?</span><textarea name="mensaje" rows={3} placeholder="Cuéntanos brevemente qué necesita tu empresa…" required /></label>
                <label className="check"><input type="checkbox" name="privacidad" required /><span>Acepto que CONTAIMP use estos datos solo para responder mi consulta.</span></label>
                <button className="btn" type="submit">Enviar mensaje <Icon name="arrow" /></button>
                <p className="form-status" role="status" aria-live="polite">{status}</p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer__grid">
          <p>CONTAIMP · Tu socio en soluciones contables y financieras. © {new Date().getFullYear()}</p>
          <a className="social" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"><Icon name="instagram" /> Instagram</a>
        </div>
      </footer>
    </div>
  );
}
