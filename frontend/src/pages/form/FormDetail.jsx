import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Download, Eye, FileSpreadsheet, FileText, LockKeyhole, RefreshCcw } from 'lucide-react';
import { useApp } from '../../AppContext.jsx';
import { api } from '../../lib/api.js';
import { downloadControlCsv } from '../../lib/csv.js';
import { dayLong, monthShort, progressOf } from '../../lib/format.js';
import PageHeading from '../../components/layout/PageHeading.jsx';
import { Alert, ProgressBar, Spinner, StatePill } from '../../components/ui.jsx';
import ActivitiesCard from './ActivitiesCard.jsx';
import ObservationsCard from './ObservationsCard.jsx';
import ExcelPreview from './ExcelPreview.jsx';

// HU-03 / HU-08 / HU-09: detalle de un control con sus actividades y observaciones.
export default function FormDetail({ id }) {
  const { isAdmin, isAccountant, isClient, navigate, notify, fail } = useApp();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [excel, setExcel] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api(`/forms/${id}`);
      setForm(r.form);
    } catch (err) {
      if (err.status === 403 || err.status === 404) navigate('sin-acceso');
      else fail(err);
    }
  }, [id, navigate, fail]);

  useEffect(() => {
    setForm(null);
    setExcel(false);
    load();
  }, [load]);

  /** Ejecuta un cambio, recarga el formulario y muestra el aviso. */
  const run = useCallback(async (action, message) => {
    setBusy(true);
    try {
      await action();
      await load();
      if (message) notify(message);
      return true;
    } catch (err) {
      fail(err);
      await load();
      return false;
    } finally {
      setBusy(false);
    }
  }, [load, notify, fail]);

  const back = { label: isAdmin ? 'Volver a la revisión' : 'Volver a formularios', onClick: () => navigate(isAdmin ? 'revision' : 'controles') };

  if (!form) {
    return (
      <>
        <PageHeading title="Detalle del formulario" back={back} />
        <div className="loading-block"><Spinner label="Cargando formulario…" /></div>
      </>
    );
  }

  const open = form.period_status === 'abierto';
  const canEdit = isAccountant && open;
  const visible = form.activities.filter((a) => !a.hidden);
  const done = visible.filter((a) => a.verified).length;
  const progress = progressOf(form.activities);
  const month = monthShort(form.period_month);
  const closedBy = form.closed_by_name && form.closed_at ? ` Cerrado por ${form.closed_by_name} el ${dayLong(form.closed_at)}.` : '';

  const closedText = isAccountant
    ? `Período cerrado. ${month} está en solo lectura: no se pueden editar actividades ni observaciones hasta que el administrador lo reabra.`
    : `Período cerrado. Los controles de ${month} están en solo lectura.${closedBy}`;

  const description = isClient
    ? 'Consulta de las actividades del control. Solo lectura.'
    : isAdmin ? 'Estado de cada actividad. Vista de solo consulta.' : 'Marca, fecha y comenta cada actividad del control.';

  return (
    <>
      <PageHeading title={form.template_name} description={description} back={back} actions={<StatePill status={form.period_status} />} />

      {!open && <Alert tone="info" icon={LockKeyhole}>{closedText}</Alert>}
      {isClient && open && <Alert tone="info" icon={Eye}>Tu perfil de cliente tiene permisos de consulta únicamente.</Alert>}

      <section className="card overview">
        <div className="overview-head">
          <span className="overview-icon"><FileText size={26} /></span>
          <div>
            <span className="eyebrow">Formulario de control contable</span>
            <h2>{form.template_name}</h2>
            <p>{form.company_name} <span aria-hidden="true">·</span> {month}</p>
          </div>
          <div className="overview-actions">
            <button type="button" className={`button button-secondary${excel ? ' is-on' : ''}`} aria-pressed={excel} onClick={() => setExcel((v) => !v)}><FileSpreadsheet size={16} /> Vista Excel</button>
            <button type="button" className="button button-secondary" onClick={() => downloadControlCsv(form)}><Download size={16} /> Exportar CSV</button>
            <button type="button" className="icon-button" onClick={load} aria-label="Actualizar" title="Actualizar"><RefreshCcw size={17} /></button>
          </div>
        </div>
        <div className="overview-progress">
          <span>Progreso de verificación</span>
          <strong>{progress}%</strong>
        </div>
        <ProgressBar value={progress} size="large" />
        <div className="overview-counts">
          <span><CheckCircle2 size={16} className="text-green" /> {done} completadas</span>
          <span><Clock3 size={16} className="text-amber" /> {visible.length - done} pendientes</span>
        </div>
      </section>

      {excel && <ExcelPreview form={form} />}

      <ActivitiesCard form={form} canEdit={canEdit} busy={busy} run={run} />
      <ObservationsCard form={form} canEdit={canEdit} busy={busy} run={run} />
    </>
  );
}
