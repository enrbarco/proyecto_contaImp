import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { query } from './lib/db.js';
import { fail } from './lib/http.js';
import { requireSession } from './middleware/auth.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import formsRoutes from './routes/forms.routes.js';
import activitiesRoutes from './routes/activities.routes.js';
import adminRoutes from './routes/admin.routes.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.DATABASE_URL) {
  console.error('Configura JWT_SECRET (32 caracteres mínimo) y DATABASE_URL en backend/.env');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1); // ContaImp se ejecuta detrás del proxy de Vercel.
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Rutas públicas.
app.get('/api/health', async (_req, res) => {
  await query('select 1');
  res.json({ status: 'ok', database: 'connected' });
});
app.use('/api/auth', authRoutes);

// A partir de aquí todo requiere sesión.
app.use('/api', requireSession);
app.use('/api', catalogRoutes);
app.use('/api', formsRoutes);
app.use('/api', activitiesRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, res) => fail(res, 404, 'Ruta de API no encontrada'));

// Express 5 envía aquí los errores de las rutas async.
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return fail(res, 400, 'El cuerpo de la solicitud no es JSON válido');
  if (err.message === 'Período cerrado') return fail(res, 409, 'Período cerrado'); // lo lanza el trigger de la base
  console.error(err);
  fail(res, 500, 'Error interno del servidor');
});

export default app;
