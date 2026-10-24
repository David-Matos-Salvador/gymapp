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

Variables de entorno:

| Variable                | Descripción                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`          | Conexión PostgreSQL (obligatoria)                                     |
| `AUTH_SECRET`           | Secreto de NextAuth, mínimo 32 caracteres (`openssl rand -base64 32`) |
| `AUTH_URL`              | URL base server-side (alternativa a `NEXT_PUBLIC_APP_URL`)            |
| `NEXT_PUBLIC_APP_URL`   | URL base de la app (alternativa a `AUTH_URL`)                         |
| `REDIS_URL`             | Redis opcional (`redis://` o `rediss://`)                             |
| `AUTH_GOOGLE_ID`        | Client ID de Google OAuth (opcional, junto con el secret)             |
| `AUTH_GOOGLE_SECRET`    | Client Secret de Google OAuth (opcional, junto con el ID)             |
| `STRIPE_SECRET_KEY`     | Clave de Stripe (opcional)                                            |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe (opcional)                              |

En producción, `AUTH_URL` y/o `NEXT_PUBLIC_APP_URL` deben usar HTTPS y apuntar a un dominio público (no `localhost`). Validá la configuración antes de desplegar:

```bash
npm run env:check
```

La misma validación se ejecuta automáticamente al arrancar el servidor (`src/instrumentation.ts`).

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

| Comando                     | Descripción                                       |
| --------------------------- | ------------------------------------------------- |
| `npm run dev`               | Servidor de desarrollo                            |
| `npm run build`             | Build de producción                               |
| `npm run start`             | Iniciar build de producción                       |
| `npm run lint`              | ESLint                                            |
| `npm run test`              | Tests unitarios (Vitest)                          |
| `npm run test:e2e`          | Tests end-to-end (Playwright)                     |
| `npm run test:ci`           | Lint + unitarios + e2e                            |
| `npm run db:reset`          | **Solo local**: reset con migraciones + seed demo |
| `npm run db:seed`           | Alias de `db:seed:dev`                            |
| `npm run db:seed:dev`       | Cargar datos demo sin reiniciar schema            |
| `npm run db:seed:prod`      | Seed mínimo e idempotente (solo producción)       |
| `npm run db:migrate:dev`    | Crear/aplicar migración en desarrollo             |
| `npm run db:migrate:deploy` | Aplicar migraciones pendientes (staging/prod)     |
| `npm run db:migrate:status` | Ver estado de migraciones                         |
| `npm run db:prototype`      | `db push` para prototipos, nunca producción       |
| `npm run env:check`         | Validar variables de entorno (CI/deploy)          |

## Usuarios demo

Al ejecutar `npm run db:reset`, se crean usuarios de prueba para todos los roles. Revisa `prisma/seed.ts` para las credenciales.

## Producción

Nunca usar `db:reset`, `db:prototype` ni `db push` en producción. Tampoco ejecutar `db:seed` (demo) ni `db:seed:dev`: crean usuarios y datos ficticios.

El flujo es:

```bash
# backup de la BD
# revisar migraciones pendientes
npm run db:migrate:status

# validar variables de entorno
npm run env:check

# aplicar migraciones
npm run db:migrate:deploy

# seed mínimo e idempotente: gym default + activaciones de ejercicios/equipos existentes
npm run db:seed:prod

# levantar app
npm run build
npm run start
```

`db:seed:prod` es el único seed apto para producción: crea/reutiliza el gimnasio default y activa los ejercicios y equipos de sistema ya existentes, sin usuarios demo ni datos ficticios. Se puede ejecutar más de una vez sin duplicar registros.

En Docker, `docker compose up -d` ejecuta primero el servicio `migrate` y luego la app. Las variables sensibles (`POSTGRES_PASSWORD`, `AUTH_SECRET`, `REDIS_PASSWORD`) se leen de `.env`/secret manager y no se commitean.

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
├── seed.ts        # Datos demo (solo desarrollo)
└── seed-prod.ts   # Seed mínimo e idempotente para producción
e2e/               # Tests end-to-end (Playwright)
docs/              # Documentación adicional
```
