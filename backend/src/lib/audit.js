import { query } from './db.js';

/**
 * Registra una acción administrativa en la bitácora (tabla audit_log).
 * Acepta un cliente de transacción para que el registro se guarde junto con el cambio.
 */
export function audit(actorId, entity, entityId, action, details = {}, db = { query }) {
  return db.query(
    'insert into audit_log(actor, entity, entity_id, action, details) values ($1, $2, $3, $4, $5)',
    [actorId, entity, entityId, action, JSON.stringify(details)],
  );
}
