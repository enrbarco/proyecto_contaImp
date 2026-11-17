// Crea usuarios, una empresa y un período abierto de prueba.
// Uso: definir SEED_PASSWORD (mínimo 12 caracteres) en backend/.env y ejecutar `npm run seed`.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, query } from '../src/lib/db.js';

const password = process.env.SEED_PASSWORD;
if (!password || password.length < 12) {
  console.error('Define SEED_PASSWORD con al menos 12 caracteres en backend/.env');
  process.exit(1);
}

const USERS = [
  ['Administrador de prueba', 'admin@demo.local', 'administrador'],
  ['Contador de prueba', 'contador@demo.local', 'contador'],
  ['Cliente de prueba', 'cliente@demo.local', 'cliente'],
];
const currentMonth = new Date().toISOString().slice(0, 7);

try {
  const hash = await bcrypt.hash(password, 12);
  for (const [name, email, role] of USERS) {
    await query(
      `insert into users(name, email, password_hash, role) values ($1, $2, $3, $4)
       on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role`,
      [name, email, hash, role],
    );
  }

  const company = await query(
    `insert into companies(name) values ('Empresa de Ejemplo S.A.')
     on conflict (name) do update set name = excluded.name returning id`,
  );
  const companyId = company.rows[0].id;

  const ids = await query('select id from users where email = any($1)', [USERS.map((u) => u[1])]);
  for (const { id } of ids.rows) {
    await query('insert into user_company(user_id, company_id) values ($1, $2) on conflict do nothing', [id, companyId]);
  }

  await query(
    `insert into periods(company_id, month, status) values ($1, $2, 'abierto')
     on conflict (company_id, month) do nothing`,
    [companyId, currentMonth],
  );

  console.log(`Datos de prueba creados (período abierto: ${currentMonth}).`);
  console.log('Usuarios: admin@demo.local, contador@demo.local y cliente@demo.local');
  console.log('Todos usan SEED_PASSWORD de tu archivo .env.');
} finally {
  await pool.end();
}
