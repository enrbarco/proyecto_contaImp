import { ArrowRight, CheckCircle2, Clock3, FileText, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { qs } from '../lib/api.js';
import PageHeading from '../components/layout/PageHeading.jsx';
import CompanyPeriodFilters from '../components/Filters.jsx';
import { Card, DataTable, EmptyState, Loadable, ProgressCell } from '../components/ui.jsx';

function Metric({ icon: Icon, tone, label, value }) {
  return (
    <article className="metric">
      <span className={`metric-icon metric-${tone}`}><Icon size={21} /></span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

// HU-04: el administrador supervisa el avance de los controles de una empresa.
export default function Review() {
  const { company, period, navigate, fail } = useApp();
  const { data, loading, reload } = useApiData(company ? `/review${qs({ companyId: company, period })}` : null, { onError: fail });
  const controls = data?.controls || [];
  const total = (key) => controls.reduce((n, c) => n + Number(c[key] || 0), 0);

  return (
    <>
      <PageHeading title="Revisión y seguimiento" description="Elige una empresa y un período para ver las actividades pendientes." />

      <Card>
        <CompanyPeriodFilters className="filters filters-review">
          <button type="button" className="button button-secondary" onClick={reload}><RefreshCcw size={16} /> Actualizar</button>
        </CompanyPeriodFilters>
      </Card>

      <div className="metric-grid">
        <Metric icon={FileText} tone="blue" label="Controles registrados" value={controls.length} />
        <Metric icon={CheckCircle2} tone="green" label="Actividades verificadas" value={total('completed')} />
        <Metric icon={Clock3} tone="amber" label="Actividades pendientes" value={total('pending')} />
      </div>

      <Card title="Estado de los controles" description="El avance considera solo las actividades visibles de cada formulario.">
        <Loadable
          loading={loading}
          empty={!controls.length}
          emptyState={<EmptyState icon={ShieldCheck} title="No hay controles" message="Esta empresa no tiene controles en el período elegido. Cambia los filtros." />}
        >
          <DataTable
            columns={['Control', 'Avance', 'Completadas', 'Pendientes', 'Observaciones', { label: 'Detalle', role: 'action', align: 'right' }]}
            rows={controls}
            renderRow={(c) => [
              <strong>{c.template_name}</strong>,
              <ProgressCell value={c.progress} />,
              `${c.completed}/${c.total}`,
              c.pending,
              c.observations,
              <button type="button" className="link-button" onClick={() => navigate('control', c.id)}>Revisar <ArrowRight size={15} /></button>,
            ]}
          />
        </Loadable>
      </Card>
    </>
  );
}
