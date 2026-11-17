import { useEffect, useRef } from 'react';

export const IDLE_MINUTES = 15;
const EVENTS = ['pointerdown', 'keydown', 'scroll'];

/** Llama a `onIdle` tras IDLE_MINUTES sin actividad del usuario (HU-01). */
export function useIdleLogout(enabled, onIdle) {
  const callback = useRef(onIdle);
  callback.current = onIdle;

  useEffect(() => {
    if (!enabled) return undefined;
    let timer;
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), IDLE_MINUTES * 60 * 1000);
    };
    EVENTS.forEach((e) => window.addEventListener(e, restart, { passive: true }));
    restart();
    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, restart));
    };
  }, [enabled]);
}
