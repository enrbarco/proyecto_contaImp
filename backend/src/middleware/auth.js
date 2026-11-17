import jwt from 'jsonwebtoken';
import { query } from '../lib/db.js';
import { fail } from '../lib/http.js';

export const SESSION_COOKIE = 'contaimp_session';
const SESSION_MINUTES = 30;

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

export function startSession(res, user, passwordVersion) {
  const token = jwt.sign({ ...user, passwordVersion }, process.env.JWT_SECRET, {
    expiresIn: `${SESSION_MINUTES}m`,
    algorithm: 'HS256',
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_MINUTES * 60 * 1000 });
}

export const endSession = (res) => res.clearCookie(SESSION_COOKIE, cookieOptions());

/**
 * Verifica la cookie de sesión y que la cuenta siga activa, con el mismo rol
 * y sin cambios de contraseña/permisos desde que se emitió el token.
 */
export async function requireSession(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return fail(res, 401, 'Debes iniciar sesión');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return fail(res, 401, 'Sesión no válida o vencida');
  }

  const r = await query('select role, active, password_version from users where id = $1', [payload.id]);
  const row = r.rows[0];
  if (!row || !row.active || row.role !== payload.role || row.password_version !== payload.passwordVersion) {
    return fail(res, 401, 'Sesión no válida o vencida');
  }
  req.user = payload;
  // Sesión deslizante: si el usuario sigue activo, renueva la cookie cada 5 minutos
  // para que no lo saque a los 30 minutos mientras está trabajando.
  if (Date.now() / 1000 - payload.iat > 5 * 60) {
    const { id, name, email, role } = payload;
    startSession(res, { id, name, email, role }, row.password_version);
  }
  next();
}

/** Permite el paso solo a los roles indicados. */
export const allowRoles = (roles, message) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : fail(res, 403, message);

export const adminOnly = allowRoles(['administrador'], 'Solo el administrador puede realizar esta operación');
