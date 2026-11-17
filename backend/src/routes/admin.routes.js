import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { ROLES, fail, isEmail, isMonth, isText } from '../lib/http.js';
import { adminOnly } from '../middleware/auth.js';

// HU-07 / HU-10: módulos del administrador (usuarios, empresas, períodos y bitácora).
// Todas las escrituras se autorizan en el servidor, nunca solo en la interfaz.
const router = Router();
router.use(adminOnly);

const isIdList = (v) => Array.isArray(v) && v.every((id) => typeof id === 'string');
const MIN_ADMIN_PASSWORD = 12;

async function setUserCompanies(db, userId, companyIds) {
  await db.query('delete from user_company where user_id = $1', [userId]);
  for (const companyId of new Set(companyIds)) {
    await db.query('insert into user_company(user_id, company_id) values ($1, $2)', [userId, companyId]);
  }
}

// Convierte errores de clave foránea / UUID mal formado en un 400 legible.
function companyError(res, err) {
  if (err.code === '23503' || err.code === '22P02') return fail(res, 400, 'Empresa inválida');
  throw err;
}

/* ---------- Usuarios ---------- */

router.get('/users', async (_req, res) => {
  const r = await query(
    `select u.id, u.name, u.email, u.role, u.active, u.created_at,
            coalesce(array_agg(uc.company_id::text) filter (where uc.company_id is not null), '{}') as company_ids
     from users u
     left join user_company uc on uc.user_id = u.id
     group by u.id
     order by u.name`,
  );
  res.json({ users: r.rows });
});

router.post('/users', async (req, res) => {
  const { name, email, password, role, companyIds = [] } = req.body;
  const valid = isText(name, 100) && isEmail(email) && email.length <= 254 &&
    typeof password === 'string' && password.length >= MIN_ADMIN_PASSWORD && password.length <= 128 &&
    ROLES.includes(role) && isIdList(companyIds);
  if (!valid) return fail(res, 400, `Revisa nombre, correo, rol y contraseña (mínimo ${MIN_ADMIN_PASSWORD} caracteres).`);

  try {
    const user = await transaction(async (db) => {
      const hash = await bcrypt.hash(password, 12);
      const r = await db.query(
        'insert into users(name, email, password_hash, role) values ($1, $2, $3, $4) returning id, name, email, role, active',
        [name.trim(), email.trim().toLowerCase(), hash, role],
      );
      await setUserCompanies(db, r.rows[0].id, companyIds);
      await audit(req.user.id, 'users', r.rows[0].id, 'crear', { email: r.rows[0].email, role }, db);
      return r.rows[0];
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') return fail(res, 409, 'El correo ya existe');
    return companyError(res, err);
  }
});

router.patch('/users/:id', async (req, res) => {
  const { name, role, active, companyIds, password } = req.body;
  if (name !== undefined && !isText(name, 100)) return fail(res, 400, 'Nombre inválido');
  if (role !== undefined && !ROLES.includes(role)) return fail(res, 400, 'Rol inválido');
  if (active !== undefined && typeof active !== 'boolean') return fail(res, 400, 'Estado inválido');
  if (companyIds !== undefined && !isIdList(companyIds)) return fail(res, 400, 'Empresas inválidas');
  if (password !== undefined && (typeof password !== 'string' || password.length < MIN_ADMIN_PASSWORD || password.length > 128)) {
    return fail(res, 400, `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD} caracteres.`);
  }
  if (req.user.id === req.params.id && ((role && role !== 'administrador') || active === false)) {
    return fail(res, 409, 'No puedes quitar tus propios permisos de administrador');
  }

  // Cambiar rol, estado o contraseña cierra las sesiones abiertas de esa cuenta.
  const endsSessions = role !== undefined || active !== undefined || password !== undefined;
  const passwordHash = password !== undefined ? await bcrypt.hash(password, 12) : null;

  try {
    const user = await transaction(async (db, rollback) => {
      const r = await db.query(
        `update users set
           name = coalesce($1, name),
           role = coalesce($2, role),
           active = coalesce($3, active),
           password_hash = coalesce($4, password_hash),
           password_version = password_version + $5
         where id = $6
         returning id, name, email, role, active`,
        [name?.trim() ?? null, role ?? null, active ?? null, passwordHash, endsSessions ? 1 : 0, req.params.id],
      );
      if (!r.rowCount) return rollback(null);
      if (companyIds !== undefined) await setUserCompanies(db, req.params.id, companyIds);
      const details = { name, role, active, companyIds, ...(password !== undefined && { contraseña: 'restablecida' }) };
      await audit(req.user.id, 'users', req.params.id, 'actualizar', details, db);
      return r.rows[0];
    });
    if (!user) return fail(res, 404, 'Usuario no encontrado');
    res.json({ user });
  } catch (err) {
    return companyError(res, err);
  }
});

/* ---------- Empresas ---------- */

router.post('/companies', async (req, res) => {
  const { name } = req.body;
  if (!isText(name, 150)) return fail(res, 400, 'Nombre de empresa inválido');
  try {
    const r = await query('insert into companies(name) values ($1) returning id, name', [name.trim()]);
    await audit(req.user.id, 'companies', r.rows[0].id, 'crear', { name: r.rows[0].name });
    res.status(201).json({ company: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') return fail(res, 409, 'La empresa ya existe');
    throw err;
  }
});

/* ---------- Períodos ---------- */

router.get('/periods', async (req, res) => {
  const r = await query(
    `select p.id, p.month, p.status, p.company_id, c.name as company_name, p.closed_at, cu.name as closed_by_name,
            count(distinct f.id)::int as form_count,
            count(a.id) filter (where not a.hidden)::int as total,
            count(a.id) filter (where not a.hidden and a.verified)::int as completed
     from periods p
     join companies c on c.id = p.company_id
     left join users cu on cu.id = p.closed_by
     left join forms f on f.period_id = p.id
     left join activities a on a.form_id = f.id
     where ($1::text is null or p.company_id::text = $1)
     group by p.id, c.name, cu.name
     order by p.month desc, c.name`,
    [req.query.companyId || null],
  );
  res.json({ periods: r.rows });
});

router.post('/periods', async (req, res) => {
  const { companyId, month } = req.body;
  if (typeof companyId !== 'string' || !isMonth(month)) return fail(res, 400, 'Empresa y mes válidos requeridos');
  try {
    const r = await query(
      `insert into periods(company_id, month, status) values ($1, $2, 'abierto')
       on conflict (company_id, month) do nothing returning id`,
      [companyId, month],
    );
    if (!r.rowCount) return fail(res, 409, 'Este período ya existe');
    await audit(req.user.id, 'periods', r.rows[0].id, 'abrir', { companyId, month });
    res.status(201).json({ period: r.rows[0] });
  } catch (err) {
    return companyError(res, err);
  }
});

// HU-10: cerrar (solo sin pendientes y con confirmación explícita) o reabrir un período.
router.patch('/periods/:id', async (req, res) => {
  const { status, confirmClose } = req.body;
  if (!['abierto', 'cerrado'].includes(status)) return fail(res, 400, 'Estado inválido');
  const closing = status === 'cerrado';
  if (closing && confirmClose !== true) return fail(res, 400, 'Debes confirmar el cierre del período');

  const result = await transaction(async (db, rollback) => {
    const old = await db.query('select id, status, month from periods where id = $1 for update', [req.params.id]);
    if (!old.rowCount) return rollback([404, 'Período no encontrado']);

    if (closing) {
      const pending = await db.query(
        `select count(*)::int as n from activities a join forms f on f.id = a.form_id
         where f.period_id = $1 and not a.hidden and not a.verified`,
        [req.params.id],
      );
      const n = pending.rows[0].n;
      if (n) return rollback([409, `No se puede cerrar: ${n} actividad(es) pendiente(s).`]);
    }

    const r = await db.query(
      `update periods set status = $1, closed_by = $2, closed_at = case when $1 = 'cerrado' then now() else null end
       where id = $3 returning id, status`,
      [status, closing ? req.user.id : null, req.params.id],
    );
    await audit(req.user.id, 'periods', req.params.id, closing ? 'cerrar' : 'reabrir',
      { month: old.rows[0].month, previous: old.rows[0].status }, db);
    return { period: r.rows[0] };
  });

  if (Array.isArray(result)) return fail(res, ...result);
  res.json(result);
});

/* ---------- Bitácora ---------- */

router.get('/history', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const r = await query(
    `select a.id, a.entity, a.action, a.changed_at, a.details, u.name as actor_name
     from audit_log a left join users u on u.id = a.actor
     order by a.changed_at desc limit $1`,
    [limit],
  );
  res.json({ history: r.rows });
});

export default router;
