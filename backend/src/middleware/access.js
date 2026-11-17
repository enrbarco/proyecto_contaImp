import { query } from '../lib/db.js';
import { fail } from '../lib/http.js';

// Reglas de acceso a empresas, formularios y actividades.
// El administrador ve todas las empresas; los demás, solo las asignadas.

export async function canAccessCompany(user, companyId) {
  if (user.role === 'administrador') return true;
  const r = await query('select 1 from user_company where user_id = $1 and company_id = $2', [user.id, companyId]);
  return r.rowCount > 0;
}

const FORM_SQL = `
  select f.*, c.name as company_name, p.month as period_month, p.status as period_status,
         p.closed_at, cu.name as closed_by_name, t.name as template_name
  from forms f
  join companies c on c.id = f.company_id
  join periods p on p.id = f.period_id
  join templates t on t.id = f.template_id
  left join users cu on cu.id = p.closed_by
  where f.id = $1`;

/**
 * Carga el formulario `req.params[param]` (o el de la actividad) y comprueba el acceso.
 * Deja el resultado en `req.form` y, si aplica, `req.activity`.
 */
export const loadForm = (param = 'id') => async (req, res, next) => {
  const r = await query(FORM_SQL, [req.params[param]]);
  if (!r.rowCount) return fail(res, 404, 'Formulario no encontrado');
  if (!(await canAccessCompany(req.user, r.rows[0].company_id))) {
    return fail(res, 403, 'No tienes permiso para consultar controles de esta empresa');
  }
  req.form = r.rows[0];
  next();
};

export const loadActivity = async (req, res, next) => {
  const r = await query('select id, form_id, note from activities where id = $1', [req.params.id]);
  if (!r.rowCount) return fail(res, 404, 'Actividad no encontrada');
  req.activity = r.rows[0];
  req.params.formId = r.rows[0].form_id;
  return loadForm('formId')(req, res, next);
};

/** Bloquea cualquier escritura si el período del formulario está cerrado. */
export const requireOpenPeriod = (req, res, next) =>
  req.form.period_status === 'abierto' ? next() : fail(res, 409, 'Período cerrado');
