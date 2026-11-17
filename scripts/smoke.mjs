// Prueba rápida de la API (no modifica datos).
// Uso: npm run test:smoke   (con la API corriendo; por defecto en http://localhost:4000)
const base = process.env.CONTAIMP_API || 'http://localhost:4000';
let failed = false;

async function check(label, fn) {
  try {
    const ok = await fn();
    console.log(`${ok ? 'OK    ' : 'FALLÓ '} ${label}`);
    if (!ok) failed = true;
  } catch (err) {
    console.log(`FALLÓ  ${label}: ${err.message}`);
    failed = true;
  }
}

const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

await check('API conectada con la base de datos', async () => {
  const r = await fetch(`${base}/api/health`);
  return r.status === 200 && (await r.json()).database === 'connected';
});
await check('Consultar empresas sin sesión devuelve 401', async () => (await fetch(`${base}/api/companies`)).status === 401);
await check('Crear formulario sin sesión devuelve 401', async () => (await post('/api/forms', { companyId: 'demo', period: '2026-11', template: 'cierre' })).status === 401);
await check('Credenciales erróneas rechazadas', async () => (await post('/api/auth/login', { email: 'no-existe@demo.local', password: 'incorrecta' })).status === 401);

process.exitCode = failed ? 1 : 0;
