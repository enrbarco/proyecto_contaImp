import { useEffect } from 'react';

/** Bloquea el scroll de la página mientras `active` sea verdadero (menús y ventanas modales). */
export function useBodyLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
