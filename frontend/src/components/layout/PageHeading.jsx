import { ArrowLeft } from 'lucide-react';

/** Título de cada página, con descripción, enlace de regreso opcional y acciones a la derecha. */
export default function PageHeading({ title, description, back, actions }) {
  return (
    <div className="page-heading">
      <div>
        {back && (
          <button type="button" className="link-button back-link" onClick={back.onClick}>
            <ArrowLeft size={17} /> {back.label}
          </button>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
