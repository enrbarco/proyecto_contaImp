// Utilidades compartidas por las rutas.

export const fail = (res, status, message) => res.status(status).json({ error: message });

export const ROLES = ['administrador', 'contador', 'cliente'];

export const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');
export const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
export const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role });
