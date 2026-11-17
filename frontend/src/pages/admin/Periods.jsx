import { useState } from 'react';
import { LockKeyhole, Plus, RefreshCcw } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { api } from '../../lib/api.js';
import { currentMonth, dayShort, monthLong, monthShort } from '../../lib/format.js';
import PageHeading from '../../components/layout/PageHeading.jsx';
import { Alert, Card, CompanySelect, ConfirmDialog, DataTable, EmptyState, Loadable, PeriodInput, ProgressCell, StatePill } from '../../components/ui.jsx';

// HU-10: apertura, cierre y reapertura de períodos contables.
export default function Periods() {
  const { companies, notify, fail } = useApp();
  const { data, loading, reload } = useApiData('/admin/periods', { onError: fail });
  const periods = data?.periods || [];
  const [draft, setDraft] = useState({ companyId: '', month: currentMonth() });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  async function act(action, message) {
    setBusy(true);
    try {
      await action();
      notify(message);
      await reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  function openPeriod(e) {
    e.preventDefault();
    act(() => api.post('/admin/periods', draft), `Período ${monthShort(draft.month)} abierto.`);
  }

  function askChange(p) {
    const closing = p.status === 'abierto';
    setConfirm({
      title: closing ? 'Cerrar período' : 'Reabrir período',
      message: closing
        ? `Vas a cerrar ${monthLong(p.month)} de ${p.company_name}. Sus formularios quedarán en solo lectura.`
        : `Vas a reabrir ${monthLong(p.month)} de ${p.company_name}. Los contadores podrán editar sus controles otra vez. Quedará registrado con tu nombre.`,
      confirmLabel: closing ? 'Cerrar período' : 'Reabrir período',
      danger: closing,
      run: () => act(
        () => api.patch(`/admin/periods/${p.id}`, { status: closing ? 'cerrado' : 'abierto', confirmClose: closing }),
        closing ? 'Período cerrado.' : 'Período reabierto.',
      ),
    });
  }

  return (
    <>
      <PageHeading title="Cierre de período" description="Abre, cierra o reabre los períodos contables de cada empresa." />

      <Card title="Abrir un período" description="Para crear formularios, el período de la empresa debe estar abierto.">
        <form className="inline-form" onSubmit={openPeriod}>
          <CompanySelect companies={[{ id: '', name: 'Seleccionar empresa' }, ...companies]} value={draft.companyId} onChange={(companyId) => setDraft({ ...draft, companyId })} aria-label="Empresa" />
          <PeriodInput required value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })} />
          <button type="submit" disabled={busy || !draft.companyId} className="button button-primary"><Plus size={16} /> Abrir período</button>
        </form>
      </Card>

      <Card
        title="Períodos"
        description="Solo se puede cerrar un período si no tiene actividades visibles pendientes."
        actions={<button type="button" className="button button-secondary" onClick={reload}><RefreshCcw size={16} /> Actualizar</button>}
      >
        <Loadable loading={loading && !data} empty={!periods.length} emptyState={<EmptyState title="No hay períodos registrados" message="Abre el primero con el formulario de arriba." />}>
          <DataTable
            columns={['Empresa', 'Período', 'Controles', 'Avance', 'Estado', 'Última acción', { label: 'Acción', role: 'action', align: 'right' }]}
            rows={periods}
            renderRow={(p) => [
              <strong>{p.company_name}</strong>,
              monthShort(p.month),
              p.form_count,
              <ProgressCell value={p.total ? Math.round((p.completed * 100) / p.total) : 0} />,
              <StatePill status={p.status} />,
              <span className="muted">{p.status === 'cerrado' && p.closed_at ? `Cerrado${p.closed_by_name ? ` por ${p.closed_by_name}` : ''} el ${dayShort(p.closed_at)}` : '—'}</span>,
              <button type="button" disabled={busy} className={`button ${p.status === 'abierto' ? 'button-soft' : 'button-secondary'}`} onClick={() => askChange(p)}>
                {p.status === 'abierto' ? 'Cerrar' : 'Reabrir'}
              </button>,
            ]}
          />
        </Loadable>
        <Alert tone="info" icon={LockKeyhole}>Con el período cerrado, nadie puede modificar actividades ni observaciones. Al reabrirlo se habilitan de nuevo.</Alert>
      </Card>

      {confirm && (
        <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} onConfirm={() => { const { run } = confirm; setConfirm(null); run(); }} />
      )}
    </>
  );
}
