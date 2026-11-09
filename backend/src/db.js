import 'dotenv/config';
import pg from 'pg';
// En Vercel configurar DATABASE_SSL=true para la conexión TLS con Supabase.
// Localmente se mantiene la configuración PostgreSQL habitual.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_SSL === 'true' ? {ssl: {rejectUnauthorized: true}} : {}),
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 12000
});
export const query=(sql,params=[])=>pool.query(sql,params);
