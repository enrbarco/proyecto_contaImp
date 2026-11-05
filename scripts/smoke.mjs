// Comprueba los endpoints públicos y rechazos básicos sin cambiar registros.
const base=process.env.CONTAIMP_API||'http://localhost:4000';
let failed=false;
async function check(label,fn){try{const ok=await fn();console.log(`${ok?'OK':'FALLÓ'} - ${label}`);if(!ok)failed=true}catch(e){console.log(`FALLÓ - ${label}: ${e.message}`);failed=true}}
await check('API conectada con base de datos',async()=>{const r=await fetch(base+'/api/health');const d=await r.json();return r.status===200&&d.database==='connected'});
await check('Consultar empresas sin sesión devuelve 401',async()=>{const r=await fetch(base+'/api/companies');return r.status===401});
await check('Crear formulario sin sesión devuelve 401',async()=>{const r=await fetch(base+'/api/forms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:'demo',period:'2026-11',template:'cierre'})});return r.status===401});
await check('Credenciales erróneas rechazadas',async()=>{const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'no-existe@demo.local',password:'incorrecta'})});return r.status===401});
process.exitCode=failed?1:0;
