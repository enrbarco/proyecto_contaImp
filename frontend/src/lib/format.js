// Formatos de fechas, nombres y avance usados en toda la aplicación.

export const ROLE_NAMES = { administrador: 'Administrador', contador: 'Contador', cliente: 'Cliente' };

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** Mes actual en hora local, formato AAAA-MM (toISOString usaría UTC y podría dar el mes siguiente). */
export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-11" → "NOV de 2026" */
export function monthShort(value) {
  if (!value) return '—';
  const [year, month] = value.slice(0, 7).split('-');
  return `${MONTHS[Number(month) - 1] || month} de ${year}`;
}

/** "2026-11" → "noviembre de 2026" */
export function monthLong(value) {
  if (!value) return '—';
  const [year, month] = value.slice(0, 7).split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
}

/** Fecha y hora completa → "05 NOV de 2026" */
export function dayLong(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Fecha y hora completa → "05 NOV" */
export function dayShort(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
}

/** "2026-11-05" → "05/11/2026" */
export const dmy = (value) => (value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '');

export const dateTime = (value) => new Date(value).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });

export const initials = (name = '') =>
  name.split(' ').map((word) => word[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

/** Porcentaje de actividades visibles que están verificadas. */
export function progressOf(activities = []) {
  const visible = activities.filter((a) => !a.hidden);
  return visible.length ? Math.round((visible.filter((a) => a.verified).length * 100) / visible.length) : 0;
}

export const withPeriod = (text) => (/[.!?]$/.test(text) ? text : `${text}.`);

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
