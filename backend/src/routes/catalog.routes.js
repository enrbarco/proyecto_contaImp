import { Router } from 'express';
import { query } from '../lib/db.js';
import { fail } from '../lib/http.js';

// Empresas visibles para el usuario y plantillas de control.
const router = Router();

router.get('/companies', async (req, res) => {
  const r = req.user.role === 'administrador'
    ? await query('select id, name from companies order by name')
    : await query(
      `select c.id, c.name from companies c
       join user_company uc on uc.company_id = c.id
       where uc.user_id = $1 order by c.name`,
      [req.user.id],
    );
  res.json({ companies: r.rows });
});

router.get('/templates', async (_req, res) => {
  const r = await query('select id, code, name from templates order by name');
  res.json({ templates: r.rows });
});

router.get('/templates/:code/activities', async (req, res) => {
  const r = await query(
    `select t.id, t.code, t.name,
            coalesce(
              json_agg(json_build_object('description', ta.description, 'position', ta.position)
                       order by ta.position, ta.id) filter (where ta.id is not null),
              '[]'::json
            ) as activities
     from templates t
     left join template_activities ta on ta.template_id = t.id
     where t.code = $1
     group by t.id`,
    [req.params.code],
  );
  if (!r.rowCount) return fail(res, 404, 'Plantilla no encontrada');
  const { activities, ...template } = r.rows[0];
  res.json({ template, activities });
});

export default router;
