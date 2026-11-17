import { useMemo, useState } from 'react';
import { ArrowRight, FileText, Plus, RefreshCcw, Search } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { qs } from '../lib/api.js';
import { monthShort } from '../lib/format.js';
import PageHeading from '../components/layout/PageHeading.jsx';
import CompanyPeriodFilters from '../components/Filters.jsx';
import { Card, CountBadge, DataTable, EmptyState, Field, Loadable, StatePill } from '../components/ui.jsx';
import CreateFormModal from './form/CreateFormModal.jsx';

// HU-02 / HU-03: búsqueda de controles por empresa, período y tipo.
export default function FormsList({ id }) {
  const { isAccountant, isClient, company, companyName, period, templates, navigate, fail } = useApp();
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const creating = id === 'nuevo' && isAccountant;

  const { data, loading, reload } = useApiData(company ? `/forms${qs({ companyId: company, period })}` : null, { onError: fail });

  const forms = useMemo(() => {
    const text = search.toLowerCase().trim();
    return (data?.forms || []).filter((f) =>
      (!type || f.template_name === type) && f.template_name.toLowerCase().includes(text));
  }, [data, type, search]);

  return (
    <>
      <PageHeading
        title={isClient ? 'Consulta de formularios' : 'Formularios contables'}
        description="Consulta y organiza los controles de cada período."
        actions={isAccountant && (
          <button type="button" className="button button-primary" onClick={() => navigate('controles', 'nuevo')}>
            <Plus size={18} /> Nuevo formulario
          </button>
        )}
      />

      <Card title="Buscar controles" description="Filtra por empresa, período y tipo de control.">
        <CompanyPeriodFilters className="filters filters-4">
          <Field label="Tipo de control">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos los controles</option>
              {templates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Buscar">
            <div className="input-icon">
              <Search size={17} />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre del control" />
            </div>
          </Field>
        </CompanyPeriodFilters>
      </Card>

      <Card
        title={<>Formularios <CountBadge>{forms.length}</CountBadge></>}
        description={`Controles registrados en ${monthShort(period)}.`}
        actions={<button type="button" className="button button-secondary" onClick={reload}><RefreshCcw size={16} /> Actualizar</button>}
      >
        <Loadable
          loading={loading}
          empty={!forms.length}
          emptyState={(
            <EmptyState
              title="No se encontraron controles"
              message={isAccountant
                ? 'No hay formularios con estos filtros. Puedes crear uno nuevo desde una plantilla.'
                : 'No hay formularios para estos filtros. Cambia el período o el tipo de control.'}
            >
              {isAccountant && company && (
                <button type="button" className="button button-secondary" onClick={() => navigate('controles', 'nuevo')}><Plus size={16} /> Nuevo formulario</button>
              )}
            </EmptyState>
          )}
        >
          <DataTable
            columns={['Control contable', 'Período', 'Estado', { label: 'Acción', role: 'action', align: 'right' }]}
            rows={forms}
            renderRow={(f) => [
              <div className="cell-with-icon"><span className="cell-icon"><FileText size={18} /></span><div><strong>{f.template_name}</strong><small>{companyName}</small></div></div>,
              monthShort(f.period_month),
              <StatePill status={f.period_status} />,
              <button type="button" className="link-button" onClick={() => navigate('control', f.id)}>Ver detalle <ArrowRight size={15} /></button>,
            ]}
          />
        </Loadable>
      </Card>

      {creating && (
        <CreateFormModal
          onClose={() => navigate('controles', null, { replace: true })}
          onCreated={(formId) => navigate('control', formId, { replace: true })}
        />
      )}
    </>
  );
}
