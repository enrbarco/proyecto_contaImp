import { Download } from 'lucide-react';
import { downloadControlCsv } from '../../lib/csv.js';
import { dmy } from '../../lib/format.js';
import { Card, Tag } from '../../components/ui.jsx';

/** Vista previa con aspecto de hoja de cálculo: lo mismo que se exporta a CSV. */
export default function ExcelPreview({ form }) {
  const visible = form.activities.filter((a) => !a.hidden);
  return (
    <Card
      title="Vista previa en formato Excel"
      description="Así se verá el control al exportarlo."
      actions={<button type="button" className="button button-secondary" onClick={() => downloadControlCsv(form)}><Download size={16} /> Exportar CSV</button>}
    >
      <div className="sheet-scroll">
        <table className="sheet">
          <thead><tr><th /><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
          <tbody>
            <tr className="sheet-head"><td>1</td><td>Actividad</td><td>Verificación</td><td>Fecha límite</td><td>Observación</td></tr>
            {visible.map((a, i) => (
              <tr key={a.id}>
                <td>{i + 2}</td>
                <td>{a.description}</td>
                <td>{a.verified ? 'Verificada' : 'Pendiente'}</td>
                <td>{dmy(a.due_date)}</td>
                <td>{a.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sheet-tab"><Tag tone="success">{form.template_name}</Tag></div>
    </Card>
  );
}
