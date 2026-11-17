import { Router } from 'express';
import { query, transaction } from '../lib/db.js';
import { fail, isMonth, isText } from '../lib/http.js';
import { allowRoles, adminOnly } from '../middleware/auth.js';
import { canAccessCompany, loadForm, requireOpenPeriod } from '../middleware/access.js';

const router = Router();
const accountantOnly = allowRoles(['contador'], 'Solo el contador puede crear o editar controles');

/** Valida ?companyId=&period= y que el usuario tenga acceso a esa empresa. */
async function readCompanyPeriod(req, res) {
  const { companyId, period } = req.query;
  if (!companyId || !isMonth(period)) {
    fail(res, 400, 'Empresa y período son necesarios');
    return null;
  }
  if (!(await canAccessCompany(req.user, companyId))) {
    fail(res, 403, 'No tienes acceso a esta empresa');
    return null;
  }
  return { companyId, period };
}

// HU-02 / HU-03: listado de controles de una empresa en un período.
router.get('/forms', async (req, res) => {
  const filter = await readCompanyPeriod(req, res);
  if (!filter) return;
  const r = await query(
    `select f.id, t.name as template_name, p.month as period_month, p.status as period_status
     from forms f
     join templates t on t.id = f.template_id
     join periods p on p.id = f.period_id
     where f.company_id = $1 and p.month = $2
     order by f.created_at desc`,
    [filter.companyId, filter.period],
  );
  res.json({ forms: r.rows });
});

// HU-04: estado consolidado de los controles para el administrador.
router.get('/review', adminOnly, async (req, res) => {
  const filter = await readCompanyPeriod(req, res);
  if (!filter) return;
  const r = await query(
    `select f.id, t.name as template_name, p.month as period_month, p.status as period_status,
            count(a.id) filter (where not a.hidden)::int as total,
            count(a.id) filter (where not a.hidden and a.verified)::int as completed,
            count(a.id) filter (where not a.hidden and not a.verified)::int as pending,
            count(a.id) filter (where not a.hidden and nullif(trim(a.note), '') is not null)::int as observations
     from forms f
     join templates t on t.id = f.template_id
     join periods p on p.id = f.period_id
     left join activities a on a.form_id = f.id
     where f.company_id = $1 and p.month = $2
     group by f.id, t.name, p.month, p.status
     order by t.name`,
    [filter.companyId, filter.period],
  );
  const controls = r.rows.map((row) => ({
    ...row,
    progress: row.total ? Math.round((100 * row.completed) / row.total) : 0,
  }));
  res.json({ controls });
});

// HU-02: crear un formulario a partir de una plantilla (copia sus actividades).
router.post('/forms', accountantOnly, async (req, res) => {
  const { companyId, period, template } = req.body;
  if (!companyId || !isMonth(period) || typeof template !== 'string') {
    return fail(res, 400, 'Empresa, período y plantilla requeridos');
  }
  if (!(await canAccessCompany(req.user, companyId))) return fail(res, 403, 'Empresa no autorizada');

  const result = await transaction(async (db, rollback) => {
    const p = await db.query('select id, status from periods where company_id = $1 and month = $2 for update', [companyId, period]);
    if (!p.rowCount) return rollback([409, 'El administrador debe abrir primero el período']);
    if (p.rows[0].status !== 'abierto') return rollback([409, 'Período cerrado']);

    const t = await db.query('select id from templates where code = $1', [template]);
    if (!t.rowCount) return rollback([400, 'Plantilla desconocida']);

    const exists = await db.query('select 1 from forms where period_id = $1 and template_id = $2', [p.rows[0].id, t.rows[0].id]);
    if (exists.rowCount) return rollback([409, 'Este formulario ya existe para el período']);

    const f = await db.query(
      'insert into forms(company_id, period_id, template_id, created_by) values ($1, $2, $3, $4) returning id',
      [companyId, p.rows[0].id, t.rows[0].id, req.user.id],
    );
    await db.query(
      `insert into activities(form_id, description, position)
       select $1, description, position from template_activities where template_id = $2 order by position`,
      [f.rows[0].id, t.rows[0].id],
    );
    return { form: f.rows[0] };
  });

  if (Array.isArray(result)) return fail(res, ...result);
  res.status(201).json(result);
});

router.get('/forms/:id', loadForm(), async (req, res) => {
  const activities = await query(
    'select id, description, verified, hidden, note, due_date, position from activities where form_id = $1 order by position, id',
    [req.form.id],
  );
  res.json({ form: { ...req.form, activities: activities.rows } });
});

// HU-09: el contador personaliza el formulario con actividades adicionales.
router.post('/forms/:id/activities', accountantOnly, loadForm(), requireOpenPeriod, async (req, res) => {
  const { description } = req.body;
  if (!isText(description, 250)) return fail(res, 400, 'Descripción inválida');
  const r = await query(
    `insert into activities(form_id, description, position)
     values ($1, $2, (select coalesce(max(position), 0) + 1 from activities where form_id = $1))
     returning id`,
    [req.form.id, description.trim()],
  );
  res.status(201).json({ activity: r.rows[0] });
});

export default router;
