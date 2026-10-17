# GymApp

Plataforma de gestión integral para gimnasios — membresías, rutinas, seguimiento de progreso, clases grupales y pagos.

**Stack:** Next.js 16 + React 19 + TypeScript + PostgreSQL + Prisma + Tailwind CSS v4 + NextAuth.js v5

## Roles de usuario

| Rol           | Descripción                                          |
| ------------- | ---------------------------------------------------- |
| `SUPER_ADMIN` | Administrador global — gestiona gimnasios y pagos    |
| `ADMIN`       | Dueño/administrador de un gimnasio                   |
| `TRAINER`     | Entrenador — crea rutinas, gestiona clientes         |
| `MEMBER`      | Cliente — entrena, registra progreso, reserva clases |

## Funcionalidades

- Dashboard por rol con KPIs y gráficos (Recharts)
- Gestión de membresías (alta, renovación, historial)
- Planes de rutina con splits, ejercicios, sets/reps/peso
- Logger de entrenamiento interactivo con timer de descanso
- Seguimiento corporal (medidas + fotos de progreso + gráficos)
- Clases grupales con reservas y control de capacidad
- Catálogo de ejercicios con animaciones y videos
- Gestión de equipamiento del gimnasio
- Onboarding para nuevos miembros
- Pagos (efectivo, transferencia, Stripe)
- Notificaciones por tipo (pago, membresía, clase, sistema)
- Asignación trainer-cliente con solicitudes
- Autenticación (email/contraseña + Google OAuth)

## Requisitos

- Node.js 20+
- PostgreSQL 16+
- Docker (opcional)

## Instalación

```bash
git clone <repo-url>
cd gym-app
npm install
```

Copia el archivo de variables de entorno y configura los valores:

```bash
cp .env.example .env
```

Variables requeridas en `.env`:

| Variable              | Descripción                                           |
| --------------------- | ----------------------------------------------------- |
| `DATABASE_URL`        | Conexión PostgreSQL                                   |
| `AUTH_SECRET`         | Secreto de NextAuth (`openssl rand -base64 32`)       |
| `AUTH_GOOGLE_ID`      | Client ID de Google OAuth                             |
| `AUTH_GOOGLE_SECRET`  | Client Secret de Google OAuth                         |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (default: `http://localhost:3000`) |

## Desarrollo

### Con Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Esto levanta PostgreSQL y la app en modo desarrollo con hot reload.

### Sin Docker

1. Asegúrate de tener PostgreSQL corriendo localmente.
2. Configura `DATABASE_URL` en `.env` apuntando a tu instancia local.
3. Sincroniza el schema y carga datos demo:

```bash
npm run db:reset
```

4. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos

| Comando            | Descripción                            |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Servidor de desarrollo                 |
| `npm run build`    | Build de producción                    |
| `npm run start`    | Iniciar build de producción            |
| `npm run lint`     | ESLint                                 |
| `npm run test`     | Tests unitarios (Vitest)               |
| `npm run test:e2e` | Tests end-to-end (Playwright)          |
| `npm run test:ci`  | Lint + unitarios + e2e                 |
| `npm run db:reset` | Reiniciar schema y seed de datos demo  |
| `npm run db:seed`  | Cargar datos demo sin reiniciar schema |
| `npm run db:push`  | Sincronizar schema con la DB           |

## Usuarios demo

Al ejecutar `npm run db:reset`, se crean usuarios de prueba para todos los roles. Revisa `prisma/seed.ts` para las credenciales.

## Producción

```bash
npm run build
npm run start
```

La app usa `output: "standalone"` y está preparada para desplegar en cualquier plataforma que soporte Node.js y PostgreSQL.

## Estructura del proyecto

```
src/
├── app/           # App Router (páginas, layouts, API routes)
├── components/    # Componentes React (ui/, forms/, charts/, etc.)
├── actions/       # Server Actions
├── hooks/         # Custom hooks
├── lib/           # Utilidades, auth, db, stripe
├── stores/        # Estado global (Zustand)
├── types/         # Tipos TypeScript
├── constants/     # Constantes y configuración
└── providers/     # React providers (query, auth, theme)
prisma/
├── schema.prisma  # Schema de base de datos
└── seed.ts        # Datos demo
e2e/               # Tests end-to-end (Playwright)
docs/              # Documentación adicional
```
