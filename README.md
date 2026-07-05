# CRM Proyecta Innova

CRM interno construido con **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4** y **Supabase** (autenticación + base de datos Postgres).

Incluye pantallas de Dashboard, Leads, Contactos, Ventas, Calendario, Recordatorios, Reportes y Gestión de Usuarios, protegidas por login con Supabase Auth.

---

## Requisitos previos

- **Node.js 20 o superior** (recomendado LTS) — verifica con `node -v`
- **npm** (viene con Node)
- Acceso al proyecto de **Supabase** del equipo (pide invitación al admin) o tu propio proyecto en [supabase.com](https://supabase.com)

## Puesta en marcha (paso a paso)

### 1. Clonar e instalar dependencias

```bash
git clone <URL_DEL_REPO>
cd crm_proyectainnova
npm install
```

### 2. Configurar variables de entorno

Copia la plantilla y complétala:

```bash
cp .env.example .env.local
```

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej. `https://xxxx.supabase.co`) | Supabase Dashboard → **Settings → API** → *Project URL* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon / publishable) | Supabase Dashboard → **Settings → API Keys** → *anon public* |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servidor para crear/inhabilitar empleados (pantalla Gestión de Equipo). **Nunca** exponerla al navegador | Supabase Dashboard → **Settings → API Keys** → *service_role* |

> ⚠️ `.env.local` está en `.gitignore` y **nunca se sube al repo**. Pide los valores del proyecto compartido a un compañero por un canal seguro, o usa tu propio proyecto de Supabase.

### 3. Crear la base de datos (solo si usas un proyecto Supabase nuevo)

Si el equipo ya tiene el proyecto de Supabase configurado, salta este paso.

1. Entra a **Supabase Dashboard → SQL Editor**
2. Copia todo el contenido de [`supabase/schema.sql`](supabase/schema.sql)
3. Pégalo y ejecuta **Run**

Esto crea:
- Enums de la app (roles, estados de leads/deals, etc.)
- Tablas: `profiles`, `permissions`, `contacts`, `contact_notes`, `leads`, `deals`, `events`, `tasks`, `activities`, `notifications`
- Trigger que crea automáticamente el perfil (`profiles`) al registrarse un usuario en Auth
- Políticas de Row Level Security (RLS)
- Datos semilla del catálogo de permisos

### 4. Crear un usuario para iniciar sesión

La app no tiene registro público; los usuarios se crean desde Supabase:

1. **Supabase Dashboard → Authentication → Users → Add user → Create new user**
2. Ingresa email y contraseña (marca *Auto Confirm User*)
3. El trigger de la base de datos crea su fila en `profiles` automáticamente

### 5. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Si no tienes sesión te redirige a `/login`; entra con el usuario del paso 4.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build de producción |
| `npm run lint` | Linter (ESLint) |

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login/          # Página de login (pública)
│   ├── (dashboard)/           # Rutas protegidas (requieren sesión)
│   │   ├── page.tsx           # Dashboard principal (/)
│   │   ├── leads/             # Gestión de leads
│   │   ├── contactos/         # Directorio de contactos
│   │   ├── ventas/            # Negocios / deals
│   │   ├── calendario/        # Eventos
│   │   ├── recordatorios/     # Notificaciones
│   │   ├── reportes/          # Reportes
│   │   ├── usuarios/          # Gestión de equipo
│   │   └── layout.tsx         # Layout con sidebar + topbar
│   └── layout.tsx             # Layout raíz
├── components/                # Componentes reutilizables (sidebar, topbar, modales…)
├── lib/
│   ├── nav-items.ts           # Ítems del menú lateral
│   └── supabase/
│       ├── client.ts          # Cliente Supabase para el navegador
│       └── server.ts          # Cliente Supabase para Server Components
└── proxy.ts                   # Proxy de Next.js 16: refresca sesión y protege rutas

supabase/
└── schema.sql                 # Schema completo de la base de datos
```

## Autenticación y protección de rutas

- Se usa `@supabase/ssr` con cookies para mantener la sesión entre servidor y cliente.
- `src/proxy.ts` (el reemplazo de middleware en Next.js 16) intercepta todas las rutas:
  - Sin sesión → redirige a `/login`
  - Con sesión en `/login` → redirige a `/`

## Roles y permisos

Definidos en la base de datos (`supabase/schema.sql`):

- **Roles** (`profiles.role`): `administrador`, `teleoperador`, `vendedor`
- Si tu base de datos se creó antes de julio 2026, ejecuta `supabase/migration_2026-07-05_roles_reuniones.sql` en el SQL Editor para actualizar roles, el estado `inhabilitado` y la columna de minutas de reunión
- **Permisos granulares**: tabla `permissions` + `profile_permissions`, gestionables desde la pantalla de Usuarios
- **RLS**: los perfiles solo se editan a sí mismos; catálogos de permisos solo los escriben administradores; las notificaciones son privadas por usuario
