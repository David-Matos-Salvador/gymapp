# Backlog — GymApp

> Generado por `task-generator` el 2026-05-21.  
> Compara el estado real del código contra `ARCHITECTURE.md`, `FEATURES_PENDIENTES.md` y `prisma/schema.prisma`.

---

## 1. Arquitectura base — Middleware, Server Components, Estados

### 🔴 1.1 — Crear `middleware.ts` con protección de rutas por rol
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: M  
- **Archivo**: `src/middleware.ts` (no existe)
- **Detalle**: Todas las rutas privadas están expuestas sin protección vía middleware. Debe redirigir a `/login` si no hay sesión, y según el rol (`MEMBER` → `/rutinas`, `TRAINER` → `/coach`, `ADMIN` → `/admin`, `SUPER_ADMIN` → `/super-admin`).
- **Depende de**: Ninguna

### 🔴 1.2 — Agregar `loading.tsx` en TODAS las rutas que consultan datos
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Archivos afectados**: 20+ rutas (`src/app/routines/loading.tsx`, `src/app/progress/loading.tsx`, `src/app/coach/loading.tsx`, `src/app/admin/loading.tsx`, etc.)
- **Estado actual**: NO existe ningún `loading.tsx` en todo el proyecto.
- **Detalle**: Cada ruta con `page.tsx` debe tener un `loading.tsx` que muestre un `<Skeleton />` mientras carga.

### 🔴 1.3 — Agregar `error.tsx` en TODAS las rutas
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Archivos afectados**: 20+ rutas (`src/app/routines/error.tsx`, `src/app/workout/error.tsx`, etc.)
- **Estado actual**: NO existe ningún `error.tsx` en todo el proyecto.

### 🟡 1.4 — Convertir páginas a Server Components donde sea posible
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: XL  
- **Archivos afectados**: `src/app/routines/page.tsx`, `src/app/routines/[id]/page.tsx`, `src/app/progress/page.tsx`, `src/app/classes/page.tsx`, `src/app/equipment/page.tsx`, `src/app/coach/clients/page.tsx` y más.
- **Estado actual**: Prácticamente todas las páginas son `"use client"` cuando deberían ser Server Components que reciben datos por props (ventaja de Next.js App Router).
- **Depende de**: 1.1 (middleware para auth en RSC)

---

## 2. API Routes faltantes

### 🔴 2.1 — `GET/PATCH /api/exercises/[id]` — CRUD de ejercicio individual
- **Prioridad**: 🔴 Alta
- **Esfuerzo**: M
- **Archivo**: `src/app/api/exercises/[id]/route.ts` (no existe)
- **Detalle**: Solo existe `GET /api/exercises` (lista). Falta detalle y actualización para subir `animationData`, `videoUrl`, `imageUrl`.
- **Depende de**: 2.2 (upload de imágenes/videos)

### 🔴 2.2 — `POST/PATCH /api/upload` — Subida de imágenes/videos con storage real
- **Prioridad**: 🔴 Alta
- **Esfuerzo**: L
- **Archivo**: `src/app/api/upload/route.ts` (ya existe, verificar si funciona)
- **Detalle**: Necesario para fotos de perfil, ejercicios, fotos de progreso, logo del gym. Evaluar integración con Uploadthing vs Cloudinary vs local `/public`.

### 🟡 2.3 — `GET/POST /api/notifications` y `PATCH /api/notifications/[id]/read`
- **Prioridad**: 🟡 Media
- **Esfuerzo**: M
- **Archivo**: `src/app/api/notifications/route.ts` (no existe)
- **Detalle**: Modelo `Notification` existe en Prisma, pero cero endpoints.

### 🟡 2.4 — `GET /api/gyms/[id]` y `PATCH /api/gyms/[id]` — Detalle y actualización de gym
- **Prioridad**: 🟡 Media
- **Esfuerzo**: S
- **Archivo**: `src/app/api/gyms/[id]/route.ts` (no existe)
- **Detalle**: Solo existe `GET/POST /api/gyms` para listar/crear. Falta ver/editar gym individual.

### 🟡 2.5 — `GET/POST/PATCH /api/progress-photos` y `DELETE /api/progress-photos/[id]`
- **Prioridad**: 🟡 Media
- **Esfuerzo**: M
- **Archivo**: `src/app/api/progress-photos/route.ts` (no existe)
- **Detalle**: Modelo `ProgressPhoto` existe en Prisma, cero endpoints.

### 🟡 2.6 — `GET /api/payments` y `PATCH /api/payments/[id]` — Historial y gestión de pagos
- **Prioridad**: 🟡 Media
- **Esfuerzo**: M
- **Archivo**: `src/app/api/payments/route.ts` (no existe)
- **Detalle**: Modelo `Payment` existe, pero no hay endpoints para listar/confirmar pagos.

### 🟡 2.7 — `DELETE /api/check-ins/[id]` — Eliminar check-in
- **Prioridad**: 🟡 Media
- **Esfuerzo**: S
- **Archivo**: `src/app/api/check-ins/[id]/route.ts` (no existe)

### ⚪ 2.8 — `GET /api/notifications/unread-count` — Badge de notificaciones no leídas
- **Prioridad**: ⚪ Baja
- **Esfuerzo**: S
- **Archivo**: `src/app/api/notifications/unread-count/route.ts`

### ⚪ 2.9 — `POST/PATCH /api/bookings/[id]` — Actualizar estado de booking
- **Prioridad**: ⚪ Baja
- **Esfuerzo**: S
- **Archivo**: `src/app/api/bookings/[id]/route.ts` (no existe, solo `POST/DELETE /api/bookings`)

---

## 3. Server Actions — Carpeta `src/actions/`

### 🔴 3.1 — Crear estructura de Server Actions para mutaciones
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Archivo**: `src/actions/` (no existe en absoluto)
- **Detalle**: La carpeta `src/actions/` no existe. Los endpoints actuales usan API Routes exclusivamente, cuando deberían usarse Server Actions para mutaciones (mejor UX con progressive enhancement en Next.js). Implementar:
  - `src/actions/routines.ts` — `createRoutine`, `updateRoutine`, `deleteRoutine`
  - `src/actions/workout-logs.ts` — `logSet`, `completeWorkout`
  - `src/actions/classes.ts` — `bookClass`, `cancelBooking`
  - `src/actions/profile.ts` — `updateProfile`, `uploadAvatar`
  - `src/actions/memberships.ts` — `confirmPayment`
  - `src/actions/notifications.ts` — `markAsRead`
- **Depende de**: 201 (validación Zod compartida)

---

## 4. Páginas faltantes

### 🔴 4.1 — Página de detalle de ejercicio `/exercise/[id]`
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Categoría**: Frontend + Backend  
- **Archivos**: `src/app/exercise/[id]/page.tsx` (no existe)
- **Detalle**: Documentado en FEATURES_PENDIENTES.md. Requiere: video/GIF del ejercicio, editor de pesos y reps, anotaciones, historial de sets anteriores. Reemplazaría el colapsable de `ExerciseCard`.
- **Depende de**: 2.1 (API exercises/[id]), 2.2 (upload de imágenes)

### 🟡 4.2 — Centro de notificaciones `/notifications`
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Categoría**: Frontend  
- **Archivo**: `src/app/notifications/page.tsx` (no existe)
- **Detalle**: Listado de notificaciones, marcar leídas, badges de no leídas en el shell. Mencionado en project-manager.md.
- **Depende de**: 2.3 (API notifications)

### 🟡 4.3 — Vista de membresía del miembro `/membresia`
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Categoría**: Frontend  
- **Archivo**: `src/app/membresia/page.tsx` (no existe)
- **Detalle**: Vista para el miembro que muestra: plan activo, fecha de vencimiento, botón de renovar. Mencionado en project-manager.md.
- **Depende de**: 2.6 (API payments)

### 🟡 4.4 — Página de timer de descanso `/timer`
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: S  
- **Categoría**: Frontend  
- **Archivo**: `src/app/timer/page.tsx` (no existe)
- **Detalle**: El componente `RestTimer` ya existe, pero no tiene página dedicada. Mencionado en project-manager.md.

### ⚪ 4.5 — Página de aterrizaje pública por gimnasio `/gym/[slug]`
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: M  
- **Archivo**: `src/app/gym/[slug]/page.tsx` (no existe)
- **Detalle**: Documentado en ARCHITECTURE.md §9. Landing pública por gimnasio con SEO.

---

## 5. Features pendientes — De `FEATURES_PENDIENTES.md`

### 🟡 5.1 — Compartir progreso (share workout summary)
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Categoría**: Frontend  
- **Archivos**: `src/components/workout/share-progress.tsx` (no existe)
- **Detalle**: Generar imagen con resumen post-workout y compartir vía Web Share API (`navigator.share`). Evaluar `html2canvas`.
- **Depende de**: Ninguna

### 🟡 5.2 — Imágenes/GIFs de ejercicios
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: L  
- **Categoría**: Frontend + Backend  
- **Detalle**: El campo `Exercise.imageUrl` y `Exercise.videoUrl` ya existen. Falta: UI para subir imagen en admin, mostrar en ExerciseCard en lugar del ícono Dumbbell genérico. Guardar en `/public/exercises/`.
- **Depende de**: 2.2 (upload API)

### 🟡 5.3 — Fotos de perfil / Avatar upload
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Categoría**: Frontend + Backend  
- **Detalle**: `User.image` y `ProgressPhoto` ya existen en Prisma. Falta UI de subida y cámara en el formulario de perfil y en mediciones corporales.
- **Depende de**: 2.2 (upload API)

### 🟡 5.4 — Encuesta de satisfacción post-workout
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: S  
- **Categoría**: Frontend + Backend  
- **Archivo**: `src/components/workout/post-workout-survey.tsx` (no existe)
- **Detalle**: Modal/overlay al finalizar workout preguntando "¿Cómo te sentiste?" (escala 1-5 o emojis). Guardar en `WorkoutLog.notes` o campo nuevo.
- **Depende de**: Ninguna

### 🟡 5.5 — Planificación inteligente de splits por día fijo
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Categoría**: Backend + Frontend  
- **Detalle**: Asignar splits a días fijos de la semana (Lunes=Push, Miércoles=Pull) en lugar de rotación secuencial. Requiere UI de asignación de splits a días y lógica de programación.
- **Depende de**: Ninguna

### ⚪ 5.6 — Racha diaria en `/rutina`
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: S  
- **Categoría**: Frontend  
- **Archivo**: `src/components/rutina/daily-streak.tsx` (no existe)
- **Detalle**: La función `calculateStreak()` ya existe en el dashboard. Mostrar en la ruta `/rutina`. Documentado en FEATURES_PENDIENTES.md.

### 🟡 5.7.1 — Sistema de múltiples roles por usuario
- **Prioridad**: 🟡 Media
- **Esfuerzo**: XL
- **Categoría**: Backend + Frontend
- **Detalle**: Actualmente `User.role` es un único enum (`UserRole`). Para que el dueño de un gym pueda ser a la vez ADMIN y TRAINER, se necesita migrar a una relación muchos-a-muchos (`UserRoleRelation` o tabla intermedia `_UserRoles`). Impacta: middleware (`proxy.ts`), todos los checks de autorización en API routes, página de admin (asignación de roles), y seed data.
- **Estado actual (workaround)**: Se ajustaron las rutas con checks exclusivos de `TRAINER` para aceptar también `ADMIN`. El rol `ADMIN` ahora tiene acceso completo a las funciones de coach.

### ⚪ 5.7 — Multi-idioma PT-BR
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: XL  
- **Categoría**: Arquitectura  
- **Detalle**: Soporte para portugués (Brasil). Preparado con labels traducibles pero sin `next-intl` o similar.
- **Depende de**: Ninguna

---

## 6. UI Components faltantes

### 🔴 6.1 — `NotificationBell` + `NotificationList` — Badge y lista de notificaciones
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: M  
- **Archivos**: `src/components/layout/notification-bell.tsx` (no existe), `src/components/notifications/` (no existe)
- **Depende de**: 2.3, 4.2

### 🟡 6.2 — `ProgressPhotoUpload` — Componente de subida de fotos de progreso
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Archivo**: `src/components/progress/photo-upload.tsx` (no existe)
- **Depende de**: 2.5 (API progress-photos)

### 🟡 6.3 — `ExerciseDetailView` — Vista completa de ejercicio con video/GIF/historial
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: L  
- **Archivo**: `src/components/exercise/exercise-detail.tsx` (no existe)
- **Depende de**: 4.1

### 🟡 6.4 — `PaymentForm` / `MembershipCard` — UI de pagos y membresía para miembros
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Archivos**: `src/components/memberships/` (no existe)
- **Depende de**: 2.6, 4.3

### 🟡 6.5 — `StripeCheckoutButton` — Botón de checkout Stripe
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Archivo**: `src/components/payments/stripe-checkout.tsx` (no existe)
- **Depende de**: 9.1 (Stripe endpoint)

### ⚪ 6.6 — `TrainerClientProgressChart` — Gráficos de progreso para la vista del coach
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: M  
- **Archivo**: `src/components/coach/client-progress-chart.tsx` (no existe)
- **Detalle**: En la ficha de cliente (`/coach/clients/[id]`), mostrar gráficos Recharts con evolución de pesos, medidas, asistencia.

### ⚪ 6.7 — Falta componente de landing page
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: S  
- **Archivo**: `src/components/landing/` (directorio vacío)
- **Detalle**: El código de landing está todo en `src/app/page.tsx` (536 líneas). Debería extraerse a componentes: `HeroSection`, `FeaturesSection`, `HowItWorksSection`, `PricingSection`, `CTASection`.
- **Depende de**: Ninguna

---

## 7. Stripe Integration

### 🔴 7.1 — `POST /api/stripe/checkout` — Crear sesión de checkout Stripe
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Archivo**: `src/app/api/stripe/checkout/route.ts` (no existe)
- **Detalle**: SDK instalado (`stripe` v22.1). Modelo `Payment` listo con `stripeSessionId`. Falta el endpoint. Debe crear un `stripe.checkout.sessions.create()` y redirigir al usuario.
- **Depende de**: Variables de entorno STRIPE_SECRET_KEY

### 🔴 7.2 — `POST /api/stripe/webhook` — Webhook de eventos Stripe
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Archivo**: `src/app/api/stripe/webhook/route.ts` (no existe)
- **Detalle**: Manejar `checkout.session.completed` → actualizar `Payment.status` a COMPLETED, crear/activar `Membership`.
- **Depende de**: 7.1

### 🟡 7.3 — `POST /api/stripe/create-customer` — Crear customer en Stripe
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: S  
- **Archivo**: `src/app/api/stripe/create-customer/route.ts` (no existe)
- **Detalle**: Crear `stripe.customers.create()` al registrar usuario, guardar `stripeCustomerId` en DB.
- **Depende de**: 7.1

---

## 8. Notificaciones Push / Email

### 🟡 8.1 — Integración con servicio de notificaciones push (Firebase Cloud Messaging)
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: XL  
- **Categoría**: Backend + Frontend  
- **Detalle**: Documentado en FEATURES_PENDIENTES.md y ARCHITECTURE.md §9. Modelo `Notification` existe. Falta: registro de device token, envío programado de push, permisos del navegador.
- **Depende de**: 2.3 (API notifications)

### 🟡 8.2 — Notificaciones por email (recordatorio de membresía, vencimiento)
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: L  
- **Categoría**: Backend  
- **Detalle**: Integrar Resend o similar para: recordatorio 7d/3d/1d antes de vencer membresía, bienvenida post-registro, resumen semanal de progreso.
- **Depende de**: Ninguna

---

## 9. Testing — Cobertura

### 🔴 9.1 — Tests unitarios para hooks
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Archivos**: `src/__tests__/hooks/` (no existe)
- **Detalle**: Los 3 hooks (`use-auth`, `use-sound`, `use-workout-session`) tienen 0 tests.
- **Depende de**: Ninguna

### 🔴 9.2 — Tests unitarios para funciones de lib
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: M  
- **Archivos**: `src/__tests__/lib/` (parcial)
- **Detalle**: Solo `utils.test.ts` existe. Falta test para `weekly-progress.ts`, `sounds.ts`, `auth.ts`.
- **Depende de**: Ninguna

### 🔴 9.3 — Tests de integración para API routes
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: XL  
- **Archivos**: `src/__tests__/api/` tiene solo `health.test.ts`
- **Detalle**: 34 API routes con literalmente 1 test. Cada endpoint necesita tests de: 200, 400, 401, 403, 404.
- **Depende de**: Ninguna

### 🟡 9.4 — Tests de componentes
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: XL  
- **Archivos**: `src/__tests__/components/` (no existe)
- **Detalle**: 40+ componentes con 0 tests unitarios de render. Priorizar: `RoutinesList`, `ExerciseCard`, `RestTimer`, `WeeklyCalendar`, `SplitCard`.
- **Depende de**: Ninguna

### 🟡 9.5 — Tests E2E adicionales
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: L  
- **Archivos**: `e2e/` (solo 2 specs)
- **Detalle**: Flujos críticos faltantes: registro completo, pago de membresía, check-in QR, reserva de clase, admin → crear plan → asignar membresía a miembro, coach → asignar cliente → crear rutina.

### ⚪ 9.6 — NPM script `test:ci` no existe
- **Prioridad**: ⚪ Baja
- **Esfuerzo**: S
- **Archivo**: `package.json`
- **Detalle**: Mencionado en `qa-tester.md` pero no está en `package.json`.

---

## 10. Deuda técnica

### 🔴 10.1 — Rutas duplicadas español vs inglés
- **Prioridad**: 🔴 Alta  
- **Esfuerzo**: L  
- **Categoría**: Arquitectura  
- **Archivos**: `src/app/routines/` y `src/app/rutinas/`, `src/app/rutina/` y `src/app/routines/`, `src/app/entrenamiento/` y `src/app/workout/`
- **Detalle**: Hay dos sistemas de rutas compitiendo: uno en español (`/rutinas/`, `/rutina/`, `/entrenamiento/`) y otro en inglés (`/routines/`, `/workout/`). Esto duplica lógica y crea confusión. Debe unificarse en uno (recomendado: español para app LATAM o inglés con redirects).

### 🟡 10.2 — Color `gym-violet` referenciado pero no definido en variables CSS
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: S  
- **Categoría**: UX-UI  
- **Archivos**: `src/app/page.tsx:43`, `src/components/routines/routines-list.tsx:85`
- **Detalle**: Se usa `text-gym-violet`, `bg-gym-violet/10`, `ring-gym-violet/20` en landing page y routines-list. Pero el CSS solo define `accent-yellow`. Esto genera clases sin efecto visual. Debe reemplazarse por variantes de opacidad de `accent-yellow` (según la estrategia restrained del design system) o definir `gym-violet` en las variables CSS.

### 🟡 10.3 — Carpeta `src/components/landing/` vacía
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Categoría**: Frontend  
- **Archivo**: `src/components/landing/` (0 archivos)
- **Detalle**: Extraer el código monolítico de `page.tsx` (536 líneas) en componentes de landing.

### 🟡 10.4 — `src/types/exercise.ts` — Revisar si se usa
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: S  
- **Archivo**: `src/types/exercise.ts`
- **Detalle**: Verificar si este tipo se usa en componentes. Si no, marcar para eliminar o integrar.

### 🟡 10.5 — `ON DELETE CASCADE` en Prisma puede causar pérdida de datos
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: M  
- **Categoría**: Backend  
- **Archivo**: `prisma/schema.prisma`
- **Detalle**: Varios modelos tienen `onDelete: Cascade` (WorkoutSetLog, RoutineSplitExercise, Booking). Evaluar si deberían ser soft-delete para mantener historial (especialmente workout logs).

### ⚪ 10.6 — Ruta `/dashboard` no redirige al role-home correcto
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: S  
- **Archivo**: `src/app/dashboard/page.tsx`
- **Detalle**: Verificar si `/dashboard` existe como ruta genérica o debería redirigir según rol.

### ⚪ 10.7 — `src/lib/prisma.ts` — Verificar uso de Prisma Accelerate vs adapter
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: S  
- **Categoría**: Backend  
- **Archivo**: `src/lib/prisma.ts`
- **Detalle**: El proyecto incluye `@prisma/adapter-pg` como dependencia pero no está claro si se usa.

### ⚪ 10.8 — Quitar video placeholder de Rick Astley en landing
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: S  
- **Archivo**: `src/app/page.tsx:405`
- **Detalle**: El iframe de YouTube apunta a `dQw4w9WgXcQ` (Rick Roll). Reemplazar por video real de demo o quitar sección.

### ⚪ 10.9 — Agregar `robots.txt` y `sitemap.xml`
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: S  
- **Categoría**: Infra  
- **Detalle**: Archivos de SEO no existen.

---

## 11. Infraestructura & DevOps

### 🟡 11.1 — GitHub Actions CI/CD no creado
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: L  
- **Categoría**: Infra  
- **Archivo**: `.github/workflows/ci.yml` (no existe)
- **Detalle**: El workflow está detallado en `devops-engineer.md` pero no está implementado. Debe incluir: lint, typecheck, test unit, test e2e.

### 🟡 11.2 — Script de backup de BD no creado
- **Prioridad**: 🟡 Media  
- **Esfuerzo**: S  
- **Categoría**: Infra  
- **Archivo**: `scripts/backup.sh` (no existe)
- **Detalle**: Mencionado en `devops-engineer.md`.

### ⚪ 11.3 — `docker-compose.yml` sin `develop` target
- **Prioridad**: ⚪ Baja  
- **Esfuerzo**: S  
- **Categoría**: Infra  
- **Archivo**: `docker-compose.yml`
- **Detalle**: Verificar si hay `docker-compose.dev.yml` separado o agregar target `develop` con hot-reload.

---

## Resumen

| Área | Tareas | Prioridad |
|------|--------|-----------|
| Arquitectura base | 4 | 🔴🔴🔴🟡 |
| API Routes | 9 | 🔴🔴🟡🟡🟡🟡🟡⚪⚪ |
| Server Actions | 1 | 🔴 |
| Páginas | 5 | 🔴🟡🟡🟡⚪ |
| Features pendientes | 7 | 🟡🟡🟡🟡🟡⚪⚪ |
| UI Components | 7 | 🔴🟡🟡🟡🟡⚪⚪ |
| Stripe | 3 | 🔴🔴🟡 |
| Notificaciones | 2 | 🟡🟡 |
| Testing | 6 | 🔴🔴🔴🟡🟡⚪ |
| Deuda técnica | 9 | 🔴🟡🟡🟡🟡⚪⚪⚪⚪ |
| Infra/DevOps | 3 | 🟡🟡⚪ |

**Total: 56 tareas**  
**Alta: 19 / Media: 27 / Baja: 10**
