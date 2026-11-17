import { ArrowRight, Building2, ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { qs } from '../lib/api.js';
import { monthShort } from '../lib/format.js';
import { IDLE_MINUTES } from '../hooks/useIdleLogout.js';
import PageHeading from '../components/layout/PageHeading.jsx';
import CompanyPeriodFilters from '../components/Filters.jsx';
import { Card, DataTable, EmptyState, Loadable, ProgressCell, StatePill } from '../components/ui.jsx';

function Kpi({ label, value, note, tone }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong className={tone ? `kpi-${tone}` : undefined}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

const sum = (rows, key) => rows.reduce((n, r) => n + Number(r[key] || 0), 0);

export default function Dashboard() {
  const { user, isAdmin, isAccountant, companies, company, companyName, period, templates, navigate, fail } = useApp();
  const path = company ? `${isAdmin ? '/review' : '/forms'}${qs({ companyId: company, period })}` : null;
  const { data, loading } = useApiData(path, { onError: fail });
  const rows = (isAdmin ? data?.controls : data?.forms) || [];

  const completed = sum(rows, 'completed');
  const pending = sum(rows, 'pending');
  const observations = sum(rows, 'observations');
  const average = rows.length ? Math.round(sum(rows, 'progress') / rows.length) : 0;
  const openCount = rows.filter((f) => f.period_status === 'abierto').length;
  const month = monthShort(period);
  const firstName = user.name.split(' ')[0];

  const kpis = isAdmin
    ? [
      { label: 'Empresas registradas', value: companies.length, note: 'Disponibles en el sistema' },
      { label: 'Actividades pendientes', value: pending, note: 'En la empresa y período elegidos', tone: 'amber' },
      { label: 'Controles registrados', value: rows.length, note: month },
      { label: 'Avance promedio', value: `${average}%`, note: `${completed} actividades completadas`, tone: 'green' },
    ]
    : [
      { label: 'Mis empresas', value: companies.length, note: 'Asignadas a tu cuenta' },
      { label: 'Controles del período', value: rows.length, note: month, tone: 'amber' },
      { label: 'Plantillas disponibles', value: templates.length, note: 'Para crear controles' },
      { label: 'Controles abiertos', value: openCount, note: 'En el período elegido', tone: 'green' },
    ];

  const columns = ['Control', 'Período', ...(isAdmin ? ['Avance'] : []), 'Estado', { label: 'Acción', role: 'action', align: 'right' }];

  return (
    <>
      <PageHeading title={`Hola, ${firstName}`} description="Resumen general de tus controles contables." />

      <div className="kpi-grid">{kpis.map((k) => <Kpi key={k.label} {...k} />)}</div>

      <div className="dashboard-grid">
        <Card
          title={isAdmin ? 'Controles por revisar' : 'Mis controles contables'}
          actions={<button type="button" className="link-button" onClick={() => navigate(isAdmin ? 'revision' : 'controles')}>Ver todos <ArrowRight size={15} /></button>}
        >
          <CompanyPeriodFilters className="filters filters-inline" />
          <Loadable
            loading={loading}
            empty={!rows.length}
            emptyState={<EmptyState title="Todavía no hay controles" message={companies.length ? 'Elige otro período o crea un control nuevo.' : 'Aún no tienes empresas asignadas.'} />}
          >
            <DataTable
              className="compact"
              columns={columns}
              rows={rows.slice(0, 8)}
              renderRow={(row) => [
                <><strong>{row.template_name}</strong><small>{companyName}</small></>,
                month,
                ...(isAdmin ? [<ProgressCell value={row.progress || 0} />] : []),
                <StatePill status={row.period_status} />,
                <button type="button" className="button button-soft" onClick={() => navigate('control', row.id)}>{isAdmin ? 'Revisar' : 'Abrir'}</button>,
              ]}
            />
          </Loadable>
        </Card>

        <Card title={isAdmin ? 'Seguimiento del período' : 'Accesos rápidos'}>
          {isAdmin ? (
            <>
              <ul className="timeline">
                <li><span className="dot dot-green" /><div><strong>{completed} actividades verificadas</strong><p>{companyName || 'Sin empresa'} · {month}</p></div></li>
                <li><span className="dot dot-amber" /><div><strong>{pending} actividades pendientes</strong><p>Deben completarse antes del cierre</p></div></li>
                <li><span className="dot" /><div><strong>{observations} observaciones</strong><p>Registradas por los contadores</p></div></li>
              </ul>
              <button type="button" className="button button-secondary button-block" onClick={() => navigate('revision')}>Revisar controles <ArrowRight size={15} /></button>
            </>
          ) : (
            <>
              <div className="quick-links">
                <button type="button" onClick={() => navigate('controles')}><ClipboardList size={18} /> Buscar formularios <ChevronRight size={16} /></button>
                <button type="button" onClick={() => navigate('empresas')}><Building2 size={18} /> Mis empresas <ChevronRight size={16} /></button>
                {isAccountant && <button type="button" onClick={() => navigate('controles', 'nuevo')}><Plus size={18} /> Crear formulario <ChevronRight size={16} /></button>}
              </div>
              <p className="card-note">Por seguridad, tu sesión se cierra sola tras {IDLE_MINUTES} minutos sin actividad.</p>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
