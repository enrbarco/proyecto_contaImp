import 'dotenv/config';
import pg from 'pg';

// En Vercel/Supabase la conexión usa SSL verificado con el certificado de la base.
const useSSL = process.env.DATABASE_SSL === 'true';
const caBase64 = process.env.DATABASE_CA_BASE64;

if (useSSL && !caBase64) {
  throw new Error('Falta DATABASE_CA_BASE64 para verificar el certificado SSL.');
}

const ssl = useSSL
  ? { rejectUnauthorized: true, ca: Buffer.from(caBase64, 'base64').toString('utf8') }
  : undefined;

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 12000,
});

export const query = (sql, params = []) => pool.query(sql, params);

/**
 * Ejecuta `work` dentro de una transacción. Si `work` lanza un error, se revierte.
 * Para cancelar sin error, `work` puede llamar a `rollback(valor)`: se revierte y se devuelve `valor`.
 */
export async function transaction(work) {
  const client = await pool.connect();
  let rolledBack = false;
  const rollback = async (value) => {
    rolledBack = true;
    await client.query('ROLLBACK');
    return value;
  };
  try {
    await client.query('BEGIN');
    const result = await work(client, rollback);
    if (!rolledBack) await client.query('COMMIT');
    return result;
  } catch (err) {
    if (!rolledBack) await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
