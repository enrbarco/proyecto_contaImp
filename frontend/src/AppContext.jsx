import { createContext, useContext } from 'react';

/**
 * Estado compartido de la aplicación con sesión iniciada:
 * usuario, empresas, empresa y período seleccionados, plantillas,
 * navegación y avisos. Lo provee <App/>.
 */
export const AppContext = createContext(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp debe usarse dentro de <AppContext.Provider>');
  return value;
}
