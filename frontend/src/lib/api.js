// Cliente HTTP de la API. Usa la cookie de sesión (httpOnly) que pone el servidor.

let onSessionExpired = null;

/** La app registra aquí qué hacer cuando el servidor responde 401 con una sesión ya iniciada. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, ...options } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...options,
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa tu internet e inténtalo otra vez.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const isAuthRoute = path.startsWith('/auth/');
    if (response.status === 401 && !isAuthRoute) onSessionExpired?.();
    throw new ApiError(data.error || 'No se pudo completar la solicitud', response.status);
  }
  return data;
}

// Atajos para que las llamadas se lean mejor.
api.post = (path, body) => api(path, { method: 'POST', body });
api.put = (path, body) => api(path, { method: 'PUT', body });
api.patch = (path, body) => api(path, { method: 'PATCH', body });
api.delete = (path) => api(path, { method: 'DELETE' });

/** Construye ?a=1&b=2 omitiendo valores vacíos. */
export const qs = (params) => {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const text = search.toString();
  return text ? `?${text}` : '';
};
