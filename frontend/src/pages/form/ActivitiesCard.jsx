import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Pencil, Plus, Save } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../lib/api.js';
import { dmy } from '../../lib/format.js';
import { Alert, Card, ConfirmDialog, CountBadge, DataTable, EmptyState, Field, Modal, ModalActions, Tag } from '../../components/ui.jsx';

const numberOf = (form, a) => a.position ?? form.activities.indexOf(a) + 1;

function listNumbers(nums) {
  return nums.length === 1 ? `la actividad ${nums[0]}` : `las actividades ${nums.slice(0, -1).join(', ')} y ${nums.at(-1)}`;
}

/** Tabla de actividades: verificación, fecha límite, observación rápida, editar y ocultar. */
export default function ActivitiesCard({ form, canEdit, busy, run }) {
  const { isAccountant, isClient, notify, fail } = useApp();
  const [dateErrors, setDateErrors] = useState([]);
  const [missingMessage, setMissingMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [hiding, setHiding] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [newActivity, setNewActivity] = useState('');

  const visible = form.activities.filter((a) => !a.hidden);
  const hidden = form.activities.filter((a) => a.hidden);
  const num = (a) => numberOf(form, a);

  const patch = (activity, changes, message = 'Cambios guardados') =>
    run(() => api.patch(`/activities/${activity.id}`, changes), message);

  function saveNote(activity, text) {
    const note = text.trim();
    return run(
      () => (note ? api.put(`/activities/${activity.id}/observation`, { note }) : api.delete(`/activities/${activity.id}/observation`)),
      note ? 'Observación guardada.' : 'Observación eliminada.',
    );
  }

  // Los cambios se guardan al momento; este botón comprueba que no falten fechas límite.
  function checkRequired() {
    const missing = visible.filter((a) => !a.due_date);
    setDateErrors(missing.map((a) => a.id));
    if (missing.length) {
      setMissingMessage(`Falta la fecha límite de ${listNumbers(missing.map(num))}.`);
      return;
    }
    setMissingMessage('');
    notify('Formulario completo. Todos los cambios están guardados.');
  }

  async function addActivity(e) {
    e.preventDefault();
    const description = newActivity.trim();
    if (!description) return;
    const ok = await run(() => api.post(`/forms/${form.id}/activities`, { description }), 'Actividad agregada.');
    if (ok) setNewActivity('');
  }

  const subtitle = canEdit
    ? 'Los cambios se guardan automáticamente al salir de cada campo.'
    : isAccountant ? 'Consulta de las actividades del período cerrado.' : 'Estado de cada actividad.';

  const columns = ['Actividad', 'Verificación', 'Fecha límite', 'Observación', ...(canEdit ? [{ label: 'Acciones', role: 'action', align: 'right' }] : [])];

  return (
    <>
      {missingMessage && <Alert tone="error">{missingMessage}</Alert>}

      <Card
        title={<>Actividades del control <CountBadge>{visible.length}</CountBadge></>}
        description={subtitle}
        actions={canEdit && <button type="button" className="button button-primary" disabled={busy} onClick={checkRequired}><Save size={16} /> Guardar cambios</button>}
      >
        {visible.length ? (
          <DataTable
            className="activities-table"
            columns={columns}
            rows={visible}
            renderRow={(a) => [
              <div className="activity-cell"><span className="index-badge">{num(a)}</span><strong>{a.description}</strong></div>,

              canEdit ? (
                <label className="check-label">
                  <input type="checkbox" disabled={busy} checked={a.verified} onChange={(e) => patch(a, { verified: e.target.checked }, e.target.checked ? 'Actividad verificada.' : 'Actividad marcada como pendiente.')} />
                  <span>{a.verified ? 'Verificada' : 'Pendiente'}</span>
                </label>
              ) : <Tag tone={a.verified ? 'success' : 'neutral'}>{a.verified ? 'Verificada' : 'Pendiente'}</Tag>,

              canEdit ? (
                <div className="date-cell">
                  <input
                    type="date"
                    className={`input-compact${dateErrors.includes(a.id) ? ' is-invalid' : ''}`}
                    aria-invalid={dateErrors.includes(a.id)}
                    aria-label={`Fecha límite de ${a.description}`}
                    defaultValue={a.due_date?.slice(0, 10) || ''}
                    onBlur={(e) => {
                      const value = e.target.value || null;
                      if (value) setDateErrors((d) => d.filter((x) => x !== a.id));
                      if (value !== (a.due_date?.slice(0, 10) || null)) patch(a, { dueDate: value }, 'Fecha guardada.');
                    }}
                  />
                  {dateErrors.includes(a.id) && <em className="field-error"><AlertCircle size={13} />Obligatoria</em>}
                </div>
              ) : dmy(a.due_date) || '—',

              canEdit ? (
                <input
                  className="input-compact note-input"
                  aria-label={`Observación de ${a.description}`}
                  maxLength={2000}
                  placeholder="Agregar observación"
                  defaultValue={a.note || ''}
                  onBlur={(e) => { if (e.target.value.trim() !== (a.note || '')) saveNote(a, e.target.value); }}
                />
              ) : (
                <span
                  className={`note-text${isClient ? ' is-locked' : ''}`}
                  title={isClient ? 'Solo lectura para tu rol' : undefined}
                >
                  {a.note || '—'}
                </span>
              ),

              ...(canEdit ? [
                <div className="row-actions">
                  <button type="button" className="icon-button" title="Editar actividad" aria-label={`Editar ${a.description}`} onClick={() => setEditing({ id: a.id, description: a.description })}><Pencil size={17} /></button>
                  <button type="button" className="icon-button" title="Ocultar actividad" aria-label={`Ocultar ${a.description}`} onClick={() => setHiding(a)}><EyeOff size={17} /></button>
                </div>,
              ] : []),
            ]}
          />
        ) : <EmptyState title="Todavía no hay actividades visibles" message={canEdit ? 'Agrega una actividad abajo.' : ''} />}

        <div className="card-footer">
          <button type="button" className="link-button" onClick={() => setShowHidden((v) => !v)} aria-expanded={showHidden} disabled={!hidden.length}>
            {showHidden ? 'Ocultar' : 'Ver'} actividades ocultas ({hidden.length})
          </button>
          <span>{hidden.length ? `${visible.length} de ${form.activities.length} actividades visibles` : `${form.activities.length} actividades en total`}</span>
        </div>

        {showHidden && hidden.length > 0 && (
          <ul className="simple-list hidden-list">
            {hidden.map((a) => (
              <li key={a.id}>
                <span className="index-badge">{num(a)}</span>
                <span className="grow muted">{a.description}</span>
                <Tag>Oculta</Tag>
                {canEdit && <button type="button" className="button button-secondary button-small" disabled={busy} onClick={() => patch(a, { hidden: false }, 'Actividad visible otra vez.')}><Eye size={16} /> Mostrar</button>}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <form className="inline-form add-activity" onSubmit={addActivity}>
            <input required maxLength={250} value={newActivity} onChange={(e) => setNewActivity(e.target.value)} placeholder="Nueva actividad para este formulario" aria-label="Descripción de la nueva actividad" />
            <button type="submit" className="button button-secondary" disabled={busy || !newActivity.trim()}><Plus size={17} /> Agregar actividad</button>
          </form>
        )}
      </Card>

      {editing && (
        <Modal title="Editar actividad" onClose={() => setEditing(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const description = editing.description.trim();
            if (!description) return;
            const ok = await run(() => api.patch(`/activities/${editing.id}`, { description }), 'Descripción actualizada.');
            if (ok) setEditing(null);
          }}
          >
            <p className="modal-text">Cambia el nombre de esta actividad dentro del formulario.</p>
            <Field label="Descripción">
              <textarea required maxLength={250} rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <ModalActions>
              <button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" className="button button-primary" disabled={busy || !editing.description.trim()}><Save size={17} /> Guardar</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {hiding && (
        <ConfirmDialog
          title="Ocultar actividad"
          message={`La actividad ${num(hiding)}, «${hiding.description}», dejará de verse en el formulario y no contará en el avance. No se elimina: puedes mostrarla otra vez cuando quieras.`}
          confirmLabel="Ocultar"
          onCancel={() => setHiding(null)}
          onConfirm={() => { const a = hiding; setHiding(null); patch(a, { hidden: true }, 'Actividad oculta.').catch(fail); }}
        />
      )}
    </>
  );
}
