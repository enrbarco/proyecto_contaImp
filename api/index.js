import app from '../backend/src/server.js';

// Conecta las rutas /api/* de Vercel con Express.
export default function handler(req, res) {
  const url = new URL(req.url || '/', 'http://vercel.internal');
  const path = url.searchParams.get('__ci_path');

  if (path === null) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Ruta de API no encontrada'
    }));
    return;
  }

  // Eliminar el parámetro usado por Vercel para el enrutamiento.
  url.searchParams.delete('__ci_path');

  // Restaurar la ruta que esperan las funciones de Express.
  req.url = '/api/' + path.replace(/^\/+/, '') + url.search;

  return app(req, res);
}