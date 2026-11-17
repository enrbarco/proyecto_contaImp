import { useState } from 'react';
import { Check, ChevronDown, Eye, FileText, Plus } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../lib/api.js';
import { monthShort, withPeriod } from '../../lib/format.js';
import { Alert, CompanySelect, Field, Modal, ModalActions, PeriodInput } from '../../components/ui.jsx';

// HU-02: crear un formulario desde una plantilla. Las actividades se copian de la plantilla.
export default function CreateFormModal({ onClose, onCreated }) {
  const { companies, company, setCompany, companyName, period, setPeriod, templates, notify } = useApp();
  const [template, setTemplate] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const templateName = templates.find((t) => t.code === template)?.name;

  function pick(code) {
    setTemplate(code);
    setListOpen(false);
    setErrors((v) => ({ ...v, template: '' }));
    setError('');
    loadPreview(code);
  }

  async function loadPreview(code) {
    setPreview({ code, loading: true, activities: [] });
    try {
      const r = await api(`/templates/${encodeURIComponent(code)}/activities`);
      setPreview({ code, activities: r.activities });
    } catch (err) {
      setPreview(null);
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const v = {};
    if (!period) v.period = 'El período es obligatorio.';
    if (!template) v.template = 'Selecciona una plantilla.';
    setErrors(v);
    setError('');
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      const r = await api.post('/forms', { companyId: company, period, template });
      notify('Formulario creado correctamente.');
      onCreated(r.form.id);
    } catch (err) {
      if (err.status === 409 && /cerrado/i.test(err.message)) {
        setError(`El período ${monthShort(period)} está cerrado. Pide al administrador que lo reabra.`);
      } else if (err.status === 409 && /abrir/i.test(err.message)) {
        setError(`El período ${monthShort(period)} todavía no está abierto. Pide al administrador que lo abra.`);
      } else {
        setError(withPeriod(err.message));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Crear formulario desde plantilla" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="modal-text">Elige la empresa, el período y la plantilla. Las actividades se cargan automáticamente.</p>
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Empresa">
          <CompanySelect companies={companies} value={company} onChange={setCompany} />
        </Field>
        <Field label="Período" error={errors.period}>
          <PeriodInput
            value={period}
            aria-invalid={Boolean(errors.period)}
            onChange={(e) => { setPeriod(e.target.value); setErrors((v) => ({ ...v, period: '' })); setError(''); }}
          />
        </Field>

        <div className={`field${errors.template ? ' has-error' : ''}`}>
          <span className="field-label" id="template-label">Plantilla</span>
          <div className="picker">
            <button
              type="button"
              className={`picker-trigger${template ? '' : ' is-placeholder'}`}
              aria-haspopup="listbox"
              aria-expanded={listOpen}
              aria-labelledby="template-label"
              onClick={() => setListOpen((v) => !v)}
            >
              {templateName || 'Selecciona una plantilla'}
              <ChevronDown size={16} className={listOpen ? 'is-open' : ''} />
            </button>
            {listOpen && (
              <ul className="picker-list" role="listbox" aria-labelledby="template-label">
                {templates.map((t) => (
                  <li key={t.id} role="option" aria-selected={t.code === template}>
                    <button type="button" className={t.code === template ? 'is-selected' : ''} onClick={() => pick(t.code)}>
                      {t.name}{t.code === template && <Check size={16} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {errors.template && <em className="field-error" role="alert">{errors.template}</em>}
        </div>

        {preview?.code === template && !listOpen && (
          <section className="template-preview" aria-live="polite">
            <div className="template-preview-head">
              <strong><Eye size={15} /> Actividades que se cargarán {!preview.loading && `(${preview.activities.length})`}</strong>
              <span>{templateName} · {companyName} · {monthShort(period)}</span>
            </div>
            {preview.loading ? <p className="muted">Cargando…</p> : preview.activities.length ? (
              <ol className="preview-list">
                {preview.activities.map((a, i) => <li key={`${a.position}-${i}`}><span className="index-badge">{i + 1}</span>{a.description}</li>)}
              </ol>
            ) : <p className="muted">La plantilla no tiene actividades predefinidas.</p>}
          </section>
        )}

        {!listOpen && <Alert tone="info" icon={FileText}>El período debe estar abierto y no puede existir ya un formulario con esta plantilla.</Alert>}

        <ModalActions>
          <button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={busy || !company} className="button button-primary"><Plus size={17} /> {busy ? 'Creando…' : 'Crear formulario'}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
