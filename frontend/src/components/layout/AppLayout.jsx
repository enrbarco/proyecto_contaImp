import { useEffect, useState } from 'react';
import { LogOut, Menu, Settings2, UserRound, X } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { useBodyLock } from '../../hooks/useBodyLock.js';
import { ROLE_NAMES, initials } from '../../lib/format.js';
import logo from '../../assets/logo.webp';

const AREA = { administrador: 'Panel del administrador', contador: 'Espacio del contador', cliente: 'Portal del cliente' };

/** Estructura de la app con sesión: menú lateral (cajón en el celular), barra superior y contenido. */
export default function AppLayout({ pages, current, children }) {
  const { user, navigate, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  useBodyLock(menuOpen);

  // Al cambiar de página se cierran el menú móvil y el de cuenta.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [current]);

  useEffect(() => {
    if (!menuOpen && !accountOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, accountOpen]);

  const active = pages[current]?.parent || current;
  const navItems = Object.entries(pages).filter(([, page]) => page.label);

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Menú">
        <div className="sidebar-brand">
          <img src={logo} alt="ContaImp" width="220" height="94" />
          <button type="button" className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <nav aria-label="Navegación principal" className="sidebar-nav">
          {navItems.map(([id, { label, icon: Icon }]) => (
            <button
              type="button"
              key={id}
              className={`nav-item${active === id ? ' is-active' : ''}`}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          {accountOpen && (
            <div className="account-menu">
              <div className="account-menu-person">
                <span className="avatar">{initials(user.name)}</span>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
              </div>
              <button type="button" onClick={() => navigate('cuenta')}><UserRound size={16} /> Mi perfil</button>
              <button type="button" onClick={() => logout()}><LogOut size={16} /> Cerrar sesión</button>
            </div>
          )}
          <button
            type="button"
            className={`account-switch${accountOpen ? ' is-active' : ''}`}
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            aria-label="Opciones de cuenta"
          >
            <span className="avatar">{initials(user.name)}</span>
            <span>
              <small>{ROLE_NAMES[user.role]}</small>
              <strong>{user.name}</strong>
            </span>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>

      {menuOpen && <button type="button" className="sidebar-overlay" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="icon-button topbar-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
          <img className="topbar-logo" src={logo} alt="ContaImp" width="98" height="42" />
          <span className="topbar-area">{AREA[user.role]}</span>
          <button type="button" className="avatar avatar-small topbar-avatar" onClick={() => navigate('cuenta')} aria-label="Mi perfil">{initials(user.name)}</button>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
