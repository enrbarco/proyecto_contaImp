import { LockKeyhole, LogOut } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { ROLE_NAMES, initials } from '../lib/format.js';
import PageHeading from '../components/layout/PageHeading.jsx';
import { Alert, Card } from '../components/ui.jsx';

export default function Account() {
  const { user, companies, logout } = useApp();
  const fields = [
    ['Nombre', user.name],
    ['Correo electrónico', user.email],
    ['Rol', ROLE_NAMES[user.role]],
    ['Empresas asignadas', user.role === 'administrador' ? 'Todas' : companies.length],
  ];

  return (
    <>
      <PageHeading title="Mi cuenta" description="Información de tu cuenta y tus permisos." />
      <Card className="account-card">
        <div className="account-banner">
          <span className="avatar avatar-large">{initials(user.name)}</span>
          <div>
            <h2>{user.name}</h2>
            <p>{ROLE_NAMES[user.role]}</p>
          </div>
        </div>
        <dl className="account-fields">
          {fields.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <Alert tone="info" icon={LockKeyhole}>Para cambiar tus datos o permisos, comunícate con el administrador.</Alert>
        <button type="button" className="button button-secondary" onClick={() => logout()}><LogOut size={16} /> Cerrar sesión</button>
      </Card>
    </>
  );
}
