import { History as HistoryIcon, RefreshCcw } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { ROLE_NAMES, dateTime, monthShort } from '../../lib/format.js';
import PageHeading from '../../components/layout/PageHeading.jsx';
import { Card, DataTable, EmptyState, Loadable, Tag } from '../../components/ui.jsx';

const ENTITIES = { users: 'Usuario', periods: 'Período', companies: 'Empresa' };
const HIDDEN_KEYS = new Set(['password', 'token', 'password_hash', 'companyIds', 'companyId']);

/** Convierte el JSON de la bitácora en un texto corto y legible. */
function describe(details = {}) {
  const parts = Object.entries(details || {})
    .filter(([key, value]) => !HIDDEN_KEYS.has(key) && value !== undefined && value !== null)
    .map(([key, value]) => {
      if (key === 'role') return `rol: ${ROLE_NAMES[value] || value}`;
      if (key === 'active') return value ? 'activada' : 'desactivada';
      if (key === 'month') return monthShort(value);
      if (key === 'previous') return `antes: ${value}`;
      if (key === 'name') return value;
      return `${key}: ${value}`;
    });
  if (Array.isArray(details?.companyIds)) parts.push(`${details.companyIds.length} empresa(s) asignada(s)`);
  return parts.join(' · ') || '—';
}

export default function HistoryPage() {
  const { fail } = useApp();
  const { data, loading, reload } = useApiData('/admin/history', { onError: fail });
  const history = data?.history || [];

  return (
    <>
      <PageHeading title="Historial de cambios" description="Registro de las acciones administrativas (últimas 100)." />
      <Card actions={<button type="button" className="button button-secondary" onClick={reload}><RefreshCcw size={16} /> Actualizar</button>}>
        <Loadable loading={loading && !data} empty={!history.length} emptyState={<EmptyState icon={HistoryIcon} title="Sin eventos registrados" message="Las nuevas operaciones administrativas aparecerán aquí." />}>
          <DataTable
            columns={['Fecha', 'Responsable', 'Elemento', 'Acción', 'Detalle']}
            rows={history}
            renderRow={(h) => [
              <span className="nowrap">{dateTime(h.changed_at)}</span>,
              h.actor_name || 'Sistema',
              ENTITIES[h.entity] || h.entity,
              <Tag tone={h.action === 'cerrar' ? 'neutral' : 'success'}>{h.action}</Tag>,
              <span className="muted">{describe(h.details)}</span>,
            ]}
          />
        </Loadable>
      </Card>
    </>
  );
}
