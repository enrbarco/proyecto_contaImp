import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query, transaction } from '../lib/db.js';
import { fail, isEmail, publicUser } from '../lib/http.js';
import { mailIsConfigured, sendPasswordResetMail } from '../lib/mailer.js';
import { endSession, requireSession, startSession } from '../middleware/auth.js';

const router = Router();
const limiter = (limit) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false });
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// HU-01: inicio de sesión.
router.post('/login', limiter(20), async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return fail(res, 400, 'Correo y contraseña son obligatorios');
  }
  const r = await query('select * from users where lower(email) = lower($1)', [email.trim()]);
  const row = r.rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return fail(res, 401, 'Correo o contraseña incorrectos');
  }
  if (!row.active) return fail(res, 403, 'Tu cuenta está desactivada. Comunícate con el administrador.');

  const user = publicUser(row);
  startSession(res, user, row.password_version);
  res.json({ user });
});

router.get('/me', requireSession, async (req, res) => {
  const r = await query('select id, name, email, role from users where id = $1 and active = true', [req.user.id]);
  if (!r.rowCount) return fail(res, 401, 'Cuenta inactiva');
  res.json({ user: r.rows[0] });
});

router.post('/logout', (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

// HU-06: recuperación con enlace temporal de un solo uso. El token nunca se devuelve por la API.
const RESET_MESSAGE = 'Si el correo corresponde a una cuenta activa, recibirás las instrucciones para recuperar tu contraseña.';
const resetLimiter = limiter(5);

router.post('/forgot-password', resetLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !isEmail(email)) return fail(res, 400, 'Ingresa un correo válido');
  if (!mailIsConfigured()) {
    return fail(res, 503, 'La recuperación por correo aún no está configurada. Comunícate con el administrador.');
  }

  const found = await query('select id, email from users where lower(email) = $1 and active = true', [email]);
  // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
  if (!found.rowCount) return res.json({ message: RESET_MESSAGE });

  const token = crypto.randomBytes(32).toString('hex');
  const hash = sha256(token);
  const user = found.rows[0];
  await query(
    `insert into password_reset_tokens(user_id, token_hash, expires_at) values ($1, $2, now() + interval '15 minutes')`,
    [user.id, hash],
  );
  try {
    await sendPasswordResetMail(user.email, token);
  } catch (err) {
    await query('delete from password_reset_tokens where token_hash = $1', [hash]);
    console.error('Falló el envío de recuperación:', err?.message);
    return fail(res, 503, 'No fue posible enviar el correo. Intenta más tarde.');
  }
  res.json({ message: RESET_MESSAGE });
});

router.post('/reset-password', resetLimiter, async (req, res) => {
  const { token, password } = req.body;
  const validToken = typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
  const validPassword = typeof password === 'string' && password.length >= 8 && password.length <= 128;
  if (!validToken || !validPassword) {
    return fail(res, 400, 'Enlace inválido o contraseña demasiado corta (mínimo 8 caracteres)');
  }

  const updated = await transaction(async (db, rollback) => {
    const r = await db.query(
      'select user_id from password_reset_tokens where token_hash = $1 and used_at is null and expires_at > now() for update',
      [sha256(token)],
    );
    if (!r.rowCount) return rollback(false);
    const userId = r.rows[0].user_id;
    const passwordHash = await bcrypt.hash(password, 12);
    // Subir password_version invalida todas las sesiones abiertas de la cuenta.
    await db.query(
      'update users set password_hash = $1, password_version = password_version + 1 where id = $2 and active = true',
      [passwordHash, userId],
    );
    await db.query('update password_reset_tokens set used_at = now() where user_id = $1 and used_at is null', [userId]);
    return true;
  });

  if (!updated) return fail(res, 400, 'El enlace venció o ya fue utilizado');
  endSession(res);
  res.json({ message: 'Contraseña actualizada. Ahora puedes iniciar sesión.' });
});

export default router;
