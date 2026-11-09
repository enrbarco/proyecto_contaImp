import 'dotenv/config';
import pg from 'pg';

const useSSL = process.env.DATABASE_SSL === 'true';

const caBase64 = process.env.DATABASE_CA_BASE64;
import { createHash } from 'node:crypto';

console.log('DIAGNOSTICO SSL:', {
  sslActivo: process.env.DATABASE_SSL === 'true',
  certificadoCargado: Boolean(caBase64),
  certificadoSHA256: caBase64
    ? createHash('sha256')
        .update(Buffer.from(caBase64, 'base64'))
        .digest('hex')
    : 'NO DISPONIBLE',
  servidor: process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).hostname
    : 'NO CONFIGURADO',
  puerto: process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).port
    : 'NO CONFIGURADO'
});

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