import { Router } from 'express';
import { query } from '../lib/db.js';
import { fail, isDate, isText } from '../lib/http.js';
import { allowRoles } from '../middleware/auth.js';
import { loadActivity, requireOpenPeriod } from '../middleware/access.js';

const router = Router();
const canEdit = allowRoles(['contador'], 'Solo el contador puede editar controles');
const canObserve = allowRoles(['contador', 'administrador'], 'El cliente solo puede consultar observaciones');

// Campos que el contador puede modificar: nombre en la API → columna en la base.
const EDITABLE = { description: 'description', verified: 'verified', hidden: 'hidden', note: 'note', dueDate: 'due_date' };

function validateField(key, value) {
  if ((key === 'verified' || key === 'hidden') && typeof value !== 'boolean') return 'Valor booleano inválido';
  if (key === 'description' && !isText(value, 250)) return 'Descripción inválida';
  if (key === 'note' && (typeof value !== 'string' || value.length > 2000)) return 'Observación inválida';
  if (key === 'dueDate' && value !== null && !isDate(value)) return 'Fecha inválida';
  return null;
}

// HU-03 / HU-09: marcar verificación, fecha límite, ocultar o renombrar una actividad.
router.patch('/activities/:id', canEdit, loadActivity, requireOpenPeriod, async (req, res) => {
  const entries = Object.entries(req.body).filter(([key]) => EDITABLE[key]);
  if (!entries.length) return fail(res, 400, 'Sin cambios válidos');
  for (const [key, value] of entries) {
    const error = validateField(key, value);
    if (error) return fail(res, 400, error);
  }
  const assignments = entries.map(([key], i) => `${EDITABLE[key]} = $${i + 1}`).join(', ');
  const values = entries.map(([key, value]) => (key === 'description' ? value.trim() : value));
  const r = await query(`update activities set ${assignments} where id = $${values.length + 1} returning id`, [...values, req.activity.id]);
  res.json({ activity: r.rows[0] });
});

// HU-08: observaciones por actividad.
router.get('/activities/:id/observation', loadActivity, (req, res) => {
  res.json({ observation: { activity_id: req.activity.id, note: req.activity.note } });
});

router.put('/activities/:id/observation', canObserve, loadActivity, async (req, res) => {
  const { note } = req.body;
  if (!isText(note, 2000)) return fail(res, 400, 'La observación es obligatoria y no debe exceder 2000 caracteres');
  if (req.form.period_status !== 'abierto') return fail(res, 409, 'Período cerrado');
  const r = await query('update activities set note = $1 where id = $2 returning id, note', [note.trim(), req.activity.id]);
  res.json({ observation: { activity_id: r.rows[0].id, note: r.rows[0].note } });
});

router.delete('/activities/:id/observation', canObserve, loadActivity, requireOpenPeriod, async (req, res) => {
  const r = await query("update activities set note = '' where id = $1 returning id, note", [req.activity.id]);
  res.json({ observation: { activity_id: r.rows[0].id, note: r.rows[0].note } });
});

export default router;
