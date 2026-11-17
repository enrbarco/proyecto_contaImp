# ContaImp — Controller App

Proyecto de la materia **Ingeniería de Software I** (ESPOL).

ContaImp digitaliza los formularios de control contable que se usan para el seguimiento de actividades y cierres mensuales de distintas empresas. Permite crear controles desde plantillas, marcar actividades, registrar observaciones, revisar el avance y cerrar períodos, con permisos según el tipo de usuario.

## Tecnologías

- **Frontend:** React 19 + Vite (CSS propio, sin frameworks de estilos).
- **Backend:** Node.js + Express 5.
- **Base de datos:** PostgreSQL (en producción, Supabase).
- **Despliegue:** Vercel (frontend estático + API como función).
- **Gestión:** Git/GitHub, Figma y Asana.

## Estructura del proyecto

```text
proyecto_contaImp/
├── frontend/                 Aplicación web (React)
│   ├── public/               Archivos públicos (favicon)
│   └── src/
│       ├── App.jsx           Sesión, navegación y datos compartidos
│       ├── AppContext.jsx    Contexto con usuario, empresa, período y avisos
│       ├── assets/           Logo e imágenes
│       ├── components/       Componentes reutilizables (ui.jsx) y estructura (layout/)
│       ├── hooks/            Hooks: carga de datos, cierre por inactividad…
│       ├── lib/              Cliente de la API, formatos, exportación CSV, rutas
│       ├── pages/            Una página por pantalla
│       │   ├── landing/      Portada pública
│       │   ├── form/         Detalle de un formulario de control
│       │   └── admin/        Usuarios, períodos e historial
│       └── styles/           Estilos: tokens, base, componentes, estructura y páginas
├── backend/                  API REST (Express)
│   ├── scripts/seed.js       Crea datos de prueba
│   └── src/
│       ├── app.js            Configuración de Express y rutas
│       ├── server.js         Arranque local (puerto 4000)
│       ├── lib/              Base de datos, bitácora, correo y utilidades
│       ├── middleware/       Sesión y permisos de acceso
│       └── routes/           Rutas: auth, catálogo, formularios, actividades, admin
├── api/index.js              Adaptador de la API para Vercel
├── database/schema.sql       Esquema completo de la base de datos
├── documentos/               Metodología Scrum y evidencias del equipo
├── scripts/smoke.mjs         Prueba rápida de la API
└── vercel.json               Configuración de despliegue
```

## Instalación local

**Requisitos:** Node.js 20 o superior, npm y PostgreSQL.

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone https://github.com/enrbarco/proyecto_contaImp.git
   cd proyecto_contaImp
   npm install
   ```

2. Crear la base de datos y cargar el esquema:

   ```bash
   createdb contaimp
   psql -v ON_ERROR_STOP=1 -d contaimp -f database/schema.sql
   ```

   `schema.sql` también sirve para actualizar una base existente: no borra datos.

3. Copiar `backend/.env.example` como `backend/.env` y completar `DATABASE_URL`, `JWT_SECRET` y `SEED_PASSWORD`.

4. (Opcional) Crear usuarios de prueba:

   ```bash
   npm run seed
   ```

   Crea `admin@demo.local`, `contador@demo.local` y `cliente@demo.local`, todos con la clave `SEED_PASSWORD`.

5. Iniciar la API y, en otra terminal, la web:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

La aplicación queda en `http://localhost:5173`. Para comprobar la API: `npm run test:smoke`.

## Despliegue en Vercel

Las variables de entorno necesarias están en `backend/.env.vercel.example`. Vercel ejecuta `npm run build`, publica `frontend/dist` y sirve la API desde `api/index.js`. La rama de producción es `main`.

## Roles del sistema

- **Administrador:** gestiona usuarios y empresas, supervisa los controles y abre, cierra o reabre períodos.
- **Contador:** crea, completa y personaliza los formularios de las empresas asignadas.
- **Cliente:** consulta los controles de su empresa, sin permisos de edición.

## Equipo de desarrollo

- Luis Daniel Flores Feijoó — Product Owner
- Enrique Haziel Barco Manobanda — Scrum Master
- María de Lourdes Durango Tumbaco — Desarrolladora
- Roy Eliecer García Erazo — Desarrollador

La metodología Scrum y sus evidencias están en [`documentos/metodologia`](documentos/metodologia/README.md).
