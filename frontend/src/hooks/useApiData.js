import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Carga `path` de la API y la vuelve a cargar cuando cambia.
 * Si `path` es null no hace nada (por ejemplo, mientras no hay empresa seleccionada).
 * Devuelve { data, loading, error, reload }.
 */
export function useApiData(path, { onError } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(null);
  const latest = useRef(0);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;

  const reload = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return null;
    }
    const call = ++latest.current;
    setLoading(true);
    try {
      const result = await api(path);
      // Ignora respuestas de peticiones viejas si el usuario cambió los filtros rápido.
      if (call === latest.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err) {
      if (call === latest.current) {
        setError(err);
        errorHandler.current?.(err);
      }
      return null;
    } finally {
      if (call === latest.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
