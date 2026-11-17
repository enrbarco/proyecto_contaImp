// Exportación de un control a CSV (se abre directamente en Excel).

function cell(value) {
  const text = value == null ? '' : String(value);
  // Evita que Excel interprete el texto como fórmula (inyección CSV).
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadControlCsv(form) {
  const headers = ['Empresa', 'Período', 'Control', 'N.º', 'Actividad', 'Verificada', 'Oculta', 'Fecha límite', 'Observación'];
  const rows = form.activities.map((a, index) => [
    form.company_name,
    form.period_month,
    form.template_name,
    a.position ?? index + 1,
    a.description,
    a.verified ? 'Sí' : 'No',
    a.hidden ? 'Sí' : 'No',
    a.due_date?.slice(0, 10) || '',
    a.note || '',
  ]);
  // El BOM (﻿) hace que Excel reconozca las tildes.
  const csv = '﻿' + [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `contaimp-${form.template_name}-${form.period_month}.csv`.replace(/\s+/g, '-').toLowerCase();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
