import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';

/** Lugar de la barra superior donde cada página pone su título (lo crea AppLayout). */
export const HeadingSlotContext = createContext(null);

/**
 * Título de la página. No se dibuja dentro del contenido: se coloca en la barra
 * superior, así el contenido empieza directamente con las tarjetas.
 */
export default function PageHeading({ title, description, back, actions }) {
  const slot = useContext(HeadingSlotContext);
  if (!slot) return null;

  return createPortal(
    <>
      {back && (
        <button type="button" className="icon-button topbar-back" onClick={back.onClick} aria-label={back.label} title={back.label}>
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="topbar-title">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </>,
    slot,
  );
}
