import { useState } from 'react';
import { MessageSquare, Pencil } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui.jsx';

// HU-08: observaciones del control, agrupadas en un solo lugar.
export default function ObservationsCard({ form, canEdit, busy, run }) {
  const { isAdmin, isAccountant, fail } = useApp();
  const visible = form.activities.filter((a) => !a.hidden);
  const withNotes = visible.filter((a) => a.note);
  const [draft, setDraft] = useState({ id: '', text: '' });
  const selectedId = draft.id || String(visible[0]?.id || '');
  const num = (a) => a.position ?? form.activities.indexOf(a) + 1;

  async function save(e) {
    e.preventDefault();
    const note = draft.text.trim();
    if (!note) {
      fail(new Error('Escribe la observación antes de guardar.'));
      return;
    }
    const ok = await run(() => api.put(`/activities/${selectedId}/observation`, { note }), 'Observación guardada.');
    if (ok) setDraft({ id: '', text: '' });
  }

  const description = canEdit
    ? 'Registra, consulta y edita las observaciones de cada actividad.'
    : isAdmin ? 'Registradas por el contador.' : isAccountant ? 'Registradas antes del cierre del período.' : 'Solo puedes consultarlas.';

  return (
    <Card title="Observaciones del control" description={description}>
      {withNotes.length ? (
        <ul className="simple-list notes-list">
          {withNotes.map((a) => (
            <li key={a.id}>
              <span className="index-badge">{num(a)}</span>
              <div className="grow">
                <strong>Actividad {num(a)}</strong>
                <small>{a.description}</small>
                <p>{a.note}</p>
              </div>
              {canEdit && (
                <button type="button" className="icon-button" aria-label={`Editar la observación de la actividad ${num(a)}`} onClick={() => setDraft({ id: String(a.id), text: a.note })}>
                  <Pencil size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="muted">Todavía no hay observaciones registradas.</p>}

      {canEdit && visible.length > 0 && (
        <form className="inline-form notes-form" onSubmit={save}>
          <select
            aria-label="Actividad de la observación"
            value={selectedId}
            onChange={(e) => setDraft({ id: e.target.value, text: visible.find((a) => String(a.id) === e.target.value)?.note || '' })}
          >
            {visible.map((a) => <option key={a.id} value={a.id}>{num(a)}. {a.description}</option>)}
          </select>
          <input aria-label="Observación" maxLength={2000} placeholder="Escribe una observación" value={draft.text} onChange={(e) => setDraft({ id: selectedId, text: e.target.value })} />
          <button type="submit" className="button button-primary" disabled={busy}><MessageSquare size={16} /> Guardar observación</button>
        </form>
      )}
    </Card>
  );
}
