# Backlog — GymApp

> Generado por `task-generator` el 2026-05-21.  
> Actualizado el 2026-05-22 — 40 tareas completadas, movidas a `COMPLETED.md`.

---

## 1. Arquitectura base — Middleware, Server Components, Estados

### 🔴 1.1 — Crear `middleware.ts` con protección de rutas por rol

- **Prioridad**: 🔴 Alta
- **Esfuerzo**: M
- **Archivo**: `src/middleware.ts` (no existe)
- **Detalle**: Todas las rutas privadas están expuestas sin protección vía middleware. Debe redirigir a `/login` si no hay sesión, y según el rol (`MEMBER` → `/rutinas`, `TRAINER` → `/coach`, `ADMIN` → `/admin`, `SUPER_ADMIN` → `/super-admin`).
- **Depende de**: Ninguna

### 🟡 1.4 — Convertir páginas a Server Components donde sea posible

- **Prioridad**: 🟡 Media
- **Esfuerzo**: XL
- **Archivos afectados**: `src/app/routines/page.tsx`, `src/app/routines/[id]/page.tsx`, `src/app/progress/page.tsx`, `src/app/classes/page.tsx`, `src/app/equipment/page.tsx`, `src/app/coach/clients/page.tsx` y más.
- **Estado actual**: La landing page (`src/app/page.tsx`) fue refactorizada a 8 componentes en `src/components/landing/`, pero sigue siendo `"use client"`. Prácticamente todas las páginas internas siguen siendo `"use client"` cuando deberían ser Server Components.
- **Progreso parcial**: Solo landing refactorizada (extracción a componentes, no conversión a RSC).
- **Depende de**: 1.1 (middleware para auth en RSC)

---

## 5. Features pendientes — De `FEATURES_PENDIENTES.md`

### 🟡 5.5 — Planificación inteligente de splits por día fijo

- **Prioridad**: 🟡 Media
- **Esfuerzo**: M
- **Categoría**: Backend + Frontend
- **Detalle**: Asignar splits a días fijos de la semana (Lunes=Push, Miércoles=Pull) en lugar de rotación secuencial. Requiere UI de asignación de splits a días y lógica de programación. No existe campo `dayOfWeek` en `RoutineSplit`.
- **Depende de**: Ninguna

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

### 🟡 5.8 — Integración con calendarios del coach (Google/Gmail + iCloud)

- **Prioridad**: 🟡 Media
- **Esfuerzo**: XL
- **Categoría**: Backend + Frontend
- **Detalle**: Conectar Google Calendar e iCloud Calendar para leer free/busy y bloquear automáticamente las horas ocupadas del coach. Requiere OAuth/CalDAV, cifrado de credenciales, caché de disponibilidad, agenda 1:1 y validación de conflictos. El alcance completo está en `FEATURES_PENDIENTES.md` → “Integración de calendarios del coach”.
- **Depende de**: Agenda 1:1 de clientes, modelo de disponibilidad

---

## 6. UI Components faltantes

### 🔴 6.1 — `NotificationBell` + `NotificationList` — Badge y lista de notificaciones

- **Prioridad**: 🔴 Alta
- **Esfuerzo**: M
- **Archivos**: `src/components/layout/notification-bell.tsx` (no existe), `src/components/notifications/` (no existe)
- **Depende de**: Ninguna (APIs 2.3 y 2.8 ya existen)

### 🟡 6.5 — `StripeCheckoutButton` — Botón de checkout Stripe

- **Prioridad**: 🟡 Media
- **Esfuerzo**: M
- **Archivo**: `src/components/payments/stripe-checkout.tsx` (no existe)
- **Depende de**: 7.1 (Stripe endpoint — ya implementado)

---

## 8. Notificaciones Push / Email

### 🟡 8.1 — Integración con servicio de notificaciones push (Firebase Cloud Messaging)

- **Prioridad**: 🟡 Media
- **Esfuerzo**: XL
- **Categoría**: Backend + Frontend
- **Detalle**: Documentado en FEATURES_PENDIENTES.md y ARCHITECTURE.md §9. Existen stubs en `src/lib/push-notifications.ts` con `// TODO: Integrate with FCM`. El endpoint `src/app/api/notifications/send/route.ts` existe, pero el envío real de push no está implementado.
- **Depende de**: Ninguna (API notifications ya existe)

### 🟡 8.2 — Notificaciones por email (recordatorio de membresía, vencimiento)

- **Prioridad**: 🟡 Media
- **Esfuerzo**: L
- **Categoría**: Backend
- **Detalle**: Existen stubs en `src/lib/email.ts` con `// TODO: Replace with Resend or SendGrid`. El endpoint `src/app/api/notifications/send/route.ts` llama a `sendMembershipReminder()`, pero la función subyacente solo loggea a consola.
- **Depende de**: Ninguna

---

## 9. Testing — Cobertura

### 🟡 9.2 — Tests unitarios para funciones de lib (parcial: 2/4)

- **Prioridad**: 🟡 Media
- **Esfuerzo**: S
- **Archivos**: `src/__tests__/lib/`
- **Estado actual**: `utils.test.ts` y `weekly-progress.test.ts` existen. Falta: `sounds.test.ts` y `auth.test.ts`.
- **Depende de**: Ninguna

### 🟡 9.3 — Tests de integración para API routes (parcial: 6/34+)

- **Prioridad**: 🔴 Alta
- **Esfuerzo**: XL
- **Archivos**: `src/__tests__/api/` tiene 6 archivos: `health.test.ts`, `auth.test.ts`, `routines.test.ts`, `exercises.test.ts`, `workout-logs.test.ts`, `body-measurements.test.ts`
- **Detalle**: 28+ API routes sin tests. Cada endpoint necesita tests de: 200, 400, 401, 403, 404.
- **Depende de**: Ninguna

### 🟡 9.4 — Tests de componentes

- **Prioridad**: 🟡 Media
- **Esfuerzo**: XL
- **Archivos**: `src/__tests__/components/` (no existe)
- **Detalle**: 40+ componentes con 0 tests unitarios de render. Priorizar: `RoutinesList`, `ExerciseCard`, `RestTimer`, `WeeklyCalendar`, `SplitCard`.
- **Depende de**: Ninguna

### 🟡 9.5 — Tests E2E adicionales (parcial: 5 specs, faltan flujos críticos)

- **Prioridad**: 🟡 Media
- **Esfuerzo**: L
- **Archivos**: `e2e/` tiene 5 specs: `auth.spec.ts`, `routines.spec.ts`, `workout.spec.ts`, `notifications.spec.ts`, `smoke.spec.ts` (de 2 originales)
- **Detalle**: Flujos críticos aún faltantes: registro completo, pago de membresía, check-in QR, reserva de clase, admin → crear plan → asignar membresía a miembro, coach → asignar cliente → crear rutina.

---

## 10. Deuda técnica

### 🔴 10.1 — Rutas duplicadas español vs inglés

- **Prioridad**: 🔴 Alta
- **Esfuerzo**: L
- **Categoría**: Arquitectura
- **Archivos**: `src/app/routines/` y `src/app/rutinas/`, `src/app/rutina/` y `src/app/routines/`, `src/app/entrenamiento/` y `src/app/workout/`
- **Detalle**: Hay dos sistemas de rutas compitiendo: uno en español (`/rutinas/`, `/rutina/`, `/entrenamiento/`) y otro en inglés (`/routines/`, `/workout/`). Ambos tienen `page.tsx`, `loading.tsx` y `error.tsx` completos. Esto duplica lógica y crea confusión. Debe unificarse en uno (recomendado: español para app LATAM o inglés con redirects).

### 🟡 10.5 — `ON DELETE CASCADE` en Prisma puede causar pérdida de datos

- **Prioridad**: 🟡 Media
- **Esfuerzo**: M
- **Categoría**: Backend
- **Archivo**: `prisma/schema.prisma`
- **Detalle**: 22 ocurrencias de `onDelete: Cascade` en 15 modelos (`WorkoutSetLog`, `RoutineSplitExercise`, `Booking`, `Membership`, `WorkoutLog`, etc.). Evaluar si deberían ser soft-delete para mantener historial (especialmente workout logs).

### ⚪ 10.9 — Agregar `robots.txt` y `sitemap.xml`

- **Prioridad**: ⚪ Baja
- **Esfuerzo**: S
- **Categoría**: Infra
- **Detalle**: Archivos de SEO no existen en `public/`.

---

## 11. Infraestructura & DevOps

### ⚪ 11.3 — `docker-compose.yml` sin `develop` target

- **Prioridad**: ⚪ Baja
- **Esfuerzo**: S
- **Categoría**: Infra
- **Archivo**: `docker-compose.yml`
- **Detalle**: El `app` service usa `dockerfile: Dockerfile` (build de producción). No hay target `develop` con hot-reload ni `docker-compose.dev.yml` separado.

---

## Resumen

| Área                | Tareas | Prioridad |
| ------------------- | ------ | --------- |
| Arquitectura base   | 2      | 🔴🟡      |
| Features pendientes | 3      | 🟡🟡⚪    |
| UI Components       | 2      | 🔴🟡      |
| Notificaciones      | 2      | 🟡🟡      |
| Testing             | 4      | 🟡🟡🟡🟡  |
| Deuda técnica       | 3      | 🔴🟡⚪    |
| Infra/DevOps        | 1      | ⚪        |

**Total: 17 tareas** (40 completadas → `COMPLETED.md`)  
**Alta: 4 / Media: 11 / Baja: 2**
