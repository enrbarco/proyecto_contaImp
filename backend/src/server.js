// Arranque local de la API (en Vercel se usa api/index.js).
import app from './app.js';

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`ContaImp API: http://localhost:${port}`));
