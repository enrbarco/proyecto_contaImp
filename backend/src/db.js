import 'dotenv/config';
import pg from 'pg';

const useSSL = process.env.DATABASE_SSL === 'true';

const caBase64 = process.env.DATABASE_CA_BASE64;
const parametrosConexion = process.env.DATABASE_URL
  ? [...new URL(process.env.DATABASE_URL).searchParams.keys()]
  : [];

console.log('PARAMETROS_DATABASE_URL:', parametrosConexion);
if (useSSL && !caBase64) {
  throw new Error(
    'Falta DATABASE_CA_BASE64 para verificar el certificado SSL.'
  );
}

const ssl = useSSL
  ? {
      rejectUnauthorized: true,
      ca: Buffer.from(caBase64, 'base64').toString('utf8')
    }
  : undefined;

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 12000
});

export const query = (sql, params = []) => pool.query(sql, params);