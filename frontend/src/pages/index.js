// Registro de páginas: qué ve cada rol en el menú y qué componente se abre.
import { Building2, ClipboardList, History, LayoutDashboard, Lock, ShieldCheck, Users } from 'lucide-react';
import Dashboard from './Dashboard.jsx';
import Companies from './Companies.jsx';
import FormsList from './FormsList.jsx';
import FormDetail from './form/FormDetail.jsx';
import Review from './Review.jsx';
import Account from './Account.jsx';
import Denied from './Denied.jsx';
import UsersPage from './admin/Users.jsx';
import Periods from './admin/Periods.jsx';
import HistoryPage from './admin/History.jsx';

const ALL = {
  tablero: { label: 'Tablero', icon: LayoutDashboard, component: Dashboard, roles: ['administrador', 'contador', 'cliente'] },
  empresas: { label: 'Mis empresas', icon: Building2, component: Companies, roles: ['contador', 'cliente'] },
  controles: { label: 'Controles', clientLabel: 'Consulta de formularios', icon: ClipboardList, component: FormsList, roles: ['administrador', 'contador', 'cliente'] },
  revision: { label: 'Revisión de controles', icon: ShieldCheck, component: Review, roles: ['administrador'] },
  usuarios: { label: 'Usuarios y empresas', icon: Users, component: UsersPage, roles: ['administrador'] },
  periodos: { label: 'Cierre de período', icon: Lock, component: Periods, roles: ['administrador'] },
  historial: { label: 'Historial', icon: History, component: HistoryPage, roles: ['administrador'] },
  // Páginas sin entrada en el menú.
  control: { component: FormDetail, parent: 'controles', roles: ['administrador', 'contador', 'cliente'] },
  cuenta: { component: Account, roles: ['administrador', 'contador', 'cliente'] },
  'sin-acceso': { component: Denied, roles: ['administrador', 'contador', 'cliente'] },
};

export function pagesFor(role) {
  return Object.fromEntries(
    Object.entries(ALL)
      .filter(([, page]) => page.roles.includes(role))
      .map(([id, page]) => [id, { ...page, label: role === 'cliente' && page.clientLabel ? page.clientLabel : page.label }]),
  );
}
