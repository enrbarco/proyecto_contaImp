# ContaImp — Controller App

Proyecto desarrollado para la materia **Ingeniería de Software I** de la ESPOL.

ContaImp es una aplicación de control contable que busca digitalizar los formularios utilizados para el seguimiento de actividades y cierres mensuales de diferentes empresas.

El sistema permite gestionar controles contables mediante plantillas, registrar actividades y observaciones, consultar el avance de los procesos y administrar el acceso según el tipo de usuario.

## Tecnologías utilizadas

- **Frontend:** React, Vite y Tailwind CSS.
- **Backend:** Node.js y Express.
- **Base de datos:** PostgreSQL.
- **Control de versiones:** Git y GitHub.
- **Diseño de interfaces:** Figma.
- **Gestión del proyecto:** Asana.

## Estructura del proyecto

```text
proyecto_contaImp/
├── frontend/
├── backend/
├── database/
│   ├── schema.sql
│   └── migrations/
├── README.md
└── .gitignore
```

## Instalación y ejecución

**Requisitos:** Node.js, npm y PostgreSQL.

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/enrbarco/proyecto_contaImp.git
   cd proyecto_contaImp
   ```

2. Instalar las dependencias:

   ```bash
   npm run install:all
   ```

3. Crear una base de datos en PostgreSQL llamada `contaimp` y ejecutar el archivo `database/schema.sql`.

4. Copiar `backend/.env.example` como `backend/.env` y configurar las variables de entorno para la conexión con PostgreSQL.

5. Ejecutar los scripts de migración pendientes, según las instrucciones correspondientes.

6. Iniciar el backend:

   ```bash
   npm run dev:api
   ```

7. En otra terminal, iniciar el frontend:

   ```bash
   npm run dev:web
   ```

La aplicación estará disponible en `http://localhost:5173`.

## Roles del sistema

- **Administrador:** gestiona usuarios, supervisa controles y administra la apertura y cierre de períodos.
- **Contador:** crea, completa y personaliza los formularios contables de las empresas asignadas.
- **Cliente:** consulta los controles correspondientes a su empresa sin permisos de edición.

## Equipo de desarrollo

- Luis Daniel Flores Feijoó
- Enrique Haziel Barco Manobanda
- María de Lourdes Durango Tumbaco
- Roy Eliecer García Erazo

## Estado del proyecto

En desarrollo. Las funcionalidades se implementan progresivamente según las historias de usuario y los sprints definidos por el equipo.