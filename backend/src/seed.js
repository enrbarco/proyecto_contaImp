import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {query,pool} from './db.js';
const pass=process.env.SEED_PASSWORD;
if(!pass||pass.length<12){console.error('Define SEED_PASSWORD con al menos 12 caracteres en backend/.env');process.exit(1)}
const hashed=await bcrypt.hash(pass,12);
try{
 const users=[['Administrador de prueba','admin@demo.local','administrador'],['Contador de prueba','contador@demo.local','contador'],['Cliente de prueba','cliente@demo.local','cliente']];
 for(const [name,email,role] of users)await query('insert into users(name,email,password_hash,role) values ($1,$2,$3,$4) on conflict(email) do update set name=excluded.name,password_hash=excluded.password_hash,role=excluded.role',[name,email,hashed,role]);
 const co=await query("insert into companies(name) values ('Empresa de Ejemplo S.A.') on conflict(name) do update set name=excluded.name returning id");
 const ids=await query("select id from users where email=any($1)",[users.map(v=>v[1])]);
 for(const u of ids.rows)await query('insert into user_company(user_id,company_id) values($1,$2) on conflict do nothing',[u.id,co.rows[0].id]);
 await query("insert into periods(company_id,month,status) values ($1,$2,'abierto') on conflict(company_id,month) do nothing",[co.rows[0].id,'2026-11']);
 console.log('Datos de prueba creados. Usuarios: admin@demo.local, contador@demo.local y cliente@demo.local');
 console.log('Todos usan SEED_PASSWORD de tu archivo .env. Cambia esa clave si dejas de usar datos de prueba.');
}finally{await pool.end()}
