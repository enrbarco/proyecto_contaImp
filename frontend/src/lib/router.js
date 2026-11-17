import { useEffect, useState } from 'react';

// Navegación con el hash de la URL (#/controles, #/control/<id>…).
// Así funcionan los botones Atrás/Adelante del navegador y se puede recargar sin perder la página.

export function parseHash(hash = window.location.hash) {
  const [page = '', id = ''] = hash.replace(/^#\/?/, '').split('/');
  return { page: page || 'tablero', id };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Navega a una página. Con { replace: true } no deja la página actual en el historial. */
export function go(page, id, { replace = false } = {}) {
  const next = `#/${page}${id ? `/${id}` : ''}`;
  if (window.location.hash === next) return;
  if (replace) window.location.replace(next);
  else window.location.hash = next;
}
