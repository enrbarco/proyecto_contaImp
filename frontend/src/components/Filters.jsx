import { useApp } from '../AppContext.jsx';
import { CompanySelect, Field, PeriodInput } from './ui.jsx';

/** Selectores de empresa y período (compartidos por tablero, controles y revisión). */
export default function CompanyPeriodFilters({ children, className = 'filters' }) {
  const { companies, company, setCompany, period, setPeriod } = useApp();
  return (
    <div className={className}>
      <Field label="Empresa">
        <CompanySelect companies={companies} value={company} onChange={setCompany} />
      </Field>
      <Field label="Período">
        <PeriodInput value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
      </Field>
      {children}
    </div>
  );
}
