// Componentes de interfaz reutilizables en toda la aplicación.
import { useEffect, useId, useRef } from 'react';
import { AlertCircle, CheckCircle2, FileText, Info, TriangleAlert, X } from 'lucide-react';
import { useBodyLock } from '../hooks/useBodyLock.js';
import { monthShort } from '../lib/format.js';

/* ---------- Estados ---------- */

export function StatePill({ status }) {
  const closed = status === 'cerrado';
  return (
    <span className={`state-pill ${closed ? 'is-closed' : 'is-open'}`}>
      <span aria-hidden="true" /> {closed ? 'Cerrado' : 'Abierto'}
    </span>
  );
}

export function Tag({ tone = 'neutral', children }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function ProgressBar({ value, size }) {
  return (
    <div className={`progress${size === 'large' ? ' progress-large' : ''}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function ProgressCell({ value }) {
  return (
    <div className="progress-cell">
      <ProgressBar value={value} />
      <b>{value}%</b>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  );
}

export function EmptyState({ title = 'Sin resultados', message = 'No hay información para los filtros seleccionados.', icon: Icon = FileText, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={26} /></span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}

/** Muestra un spinner mientras carga, el estado vacío si no hay filas o el contenido. */
export function Loadable({ loading, empty, emptyState, children }) {
  if (loading) return <div className="loading-block"><Spinner label="Cargando…" /></div>;
  if (empty) return emptyState;
  return children;
}

/* ---------- Avisos ---------- */

const ALERT_ICONS = { error: AlertCircle, success: CheckCircle2, info: Info, warning: TriangleAlert };

export function Alert({ tone = 'info', icon, children, role }) {
  const Icon = icon || ALERT_ICONS[tone];
  return (
    <div className={`alert alert-${tone}`} role={role || (tone === 'error' ? 'alert' : 'status')}>
      <Icon size={18} />
      <span>{children}</span>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onClose, toast.tone === 'error' ? 8000 : 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const Icon = ALERT_ICONS[toast.tone];
  return (
    <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'} key={toast.id}>
      <Icon size={18} />
      <span>{toast.message}</span>
      <button type="button" className="icon-button" aria-label="Cerrar aviso" onClick={onClose}><X size={16} /></button>
    </div>
  );
}

/* ---------- Formularios ---------- */

export function Field({ label, error, hint, children }) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && <em className="field-error" role="alert"><AlertCircle size={13} />{error}</em>}
    </label>
  );
}

/** Selector de mes que muestra «NOV de 2026» y conserva el calendario nativo. */
export function PeriodInput({ value, onChange, ...rest }) {
  return (
    <div className="period-input">
      <span className="period-text" aria-hidden="true">{monthShort(value)}</span>
      <input
        type="month"
        value={value}
        onChange={onChange}
        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* navegador sin showPicker */ } }}
        aria-label="Período"
        {...rest}
      />
    </div>
  );
}

export function CompanySelect({ companies, value, onChange, ...rest }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={!companies.length} {...rest}>
      {!companies.length && <option value="">Sin empresas asignadas</option>}
      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

/* ---------- Tarjetas y tablas ---------- */

export function Card({ title, description, actions, className = '', children }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export const CountBadge = ({ children }) => <span className="count-badge">{children}</span>;

/**
 * Tabla que en el celular se convierte en tarjetas. `columns` son los encabezados;
 * cada celda recibe su encabezado en data-label para mostrarlo en la vista móvil.
 */
export function DataTable({ columns, rows, renderRow, className = '' }) {
  return (
    <div className="table-scroll">
      <table className={`data-table ${className}`}>
        <thead>
          <tr>{columns.map((c) => <th key={c.label || c} className={c.align === 'right' ? 'align-right' : undefined}>{c.label || c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const cells = renderRow(row, index);
            return (
              <tr key={row.id ?? index}>
                {cells.map((content, i) => {
                  const col = columns[i];
                  if (content === undefined) return null;
                  return (
                    <td key={i} data-label={col.label || col} data-role={col.role} className={col.align === 'right' ? 'align-right' : undefined}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Ventanas modales ---------- */

export function Modal({ title, onClose, children, size }) {
  const ref = useRef(null);
  const titleId = useId();
  useBodyLock(true);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // En escritorio enfoca el primer campo; en táctil no, para no abrir el teclado.
    const first = ref.current?.querySelector('input:not([type=checkbox]), select, textarea, .button-primary');
    if (first && !window.matchMedia('(pointer: coarse)').matches) first.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-shade" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`modal${size === 'wide' ? ' modal-wide' : ''}`}>
        <div className="modal-grabber" aria-hidden="true" />
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ModalActions({ children }) {
  return <div className="modal-actions">{children}</div>;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal-text">{message}</p>
      <ModalActions>
        <button type="button" className="button button-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className={`button ${danger ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
      </ModalActions>
    </Modal>
  );
}
