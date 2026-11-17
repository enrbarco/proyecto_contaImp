import { ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import PageHeading from '../components/layout/PageHeading.jsx';
import { Card, EmptyState } from '../components/ui.jsx';

export default function Companies() {
  const { companies, company, setCompany, navigate, isAccountant } = useApp();

  return (
    <>
      <PageHeading title="Mis empresas" description="Empresas a las que tienes acceso." />
      <Card title="Empresas disponibles" description={`${companies.length} empresa(s) asociada(s) a tu cuenta`}>
        {companies.length ? (
          <div className="company-grid">
            {companies.map((c) => {
              const current = String(c.id) === String(company);
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`company-card${current ? ' is-current' : ''}`}
                  onClick={() => { setCompany(String(c.id)); navigate('controles'); }}
                >
                  <span className="company-icon"><Building2 size={24} /></span>
                  <span className="company-text">
                    <strong>{c.name}</strong>
                    <small>Consultar controles <ArrowRight size={13} /></small>
                  </span>
                  {current && <CheckCircle2 size={18} className="company-check" aria-label="Empresa seleccionada" />}
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="Aún no tienes empresas asignadas"
            message={`Cuando el administrador te asigne una empresa, aparecerá aquí y podrás ${isAccountant ? 'crear y revisar' : 'consultar'} sus controles.`}
          />
        )}
      </Card>
    </>
  );
}
