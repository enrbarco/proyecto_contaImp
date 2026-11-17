import { ShieldCheck } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { ROLE_NAMES } from '../lib/format.js';
import PageHeading from '../components/layout/PageHeading.jsx';
import { Card, EmptyState } from '../components/ui.jsx';

export default function Denied() {
  const { user, isClient, navigate } = useApp();
  return (
    <>
      <PageHeading title="Acceso denegado" description="No tienes permisos para ver este contenido." />
      <Card>
        <EmptyState
          icon={ShieldCheck}
          title="Permisos insuficientes"
          message={isClient
            ? 'El formulario no existe o pertenece a una empresa que no tienes asignada. Si crees que es un error, pide al administrador que revise tu acceso.'
            : `Tu rol de ${ROLE_NAMES[user.role]} no permite abrir esta sección o el formulario ya no existe. Si crees que es un error, pide al administrador que revise tu acceso.`}
        >
          <button type="button" className="button button-primary" onClick={() => navigate(isClient ? 'controles' : 'tablero')}>
            {isClient ? 'Volver a mis formularios' : 'Volver al tablero'}
          </button>
        </EmptyState>
      </Card>
    </>
  );
}
