# Auditoría ADMIN — `fix/validation-batch-1`

Root: `.kilo/worktrees/validation-integration`
Modo: read-only. No se ejecutaron fixes.
Base: `docs/quality/role-quality-loop.md`, `docs/roles/super-admin/{audit,decisions}.md`, `docs/decisions/validation-fixes.md`, `VALIDATION_REPORT.md`.

## Scope

ADMIN es operador de un gym: dashboard, membresías, pagos/comprobantes, planes, equipamiento, ejercicios del gym, rutinas propias, clases (solo lectura) y perfil. No crea gyms, admins ni owners.

## Matriz resumida

- OK: dashboard scoped, membresías lectura scoped, pagos pending/confirm/reject scoped, cobro manual con Payment, planes CRUD scoped, equipamiento por gym, activaciones, gym-exercises, rutinas propias, assign POST.
- Parcial: PATCH membresías sin scope; rutinas duplicate/assign[id]/onboarding sin scope; ejercicios globales; clases sin gym/CRUD; trainer clients; gym profile sin UI.
- No: membresías POST UI, ledger completo, clases CRUD/roster, trainers panel, notificaciones scoped, check-in delete scoped, owner sin rol ADMIN.

## Hallazgos

### ADM-01 — PATCH membresías sin gym del ADMIN

- **Alta / aislamiento.** `src/app/api/memberships/[id]/route.ts:55-77,113-158`.
- Un ADMIN de gym A modifica membresías de gym B (status, fechas, paymentConfirmed, renew).
- **Aceptación:** ADMIN solo `membership.user.gymId === user.gymId`; paymentConfirmed solo por Payment o SUPER_ADMIN; tests cross-gym.

### ADM-02 — Rutinas sin tenant en duplicate/assign[id]/onboarding

- **Alta / aislamiento.** `src/app/api/routines/duplicate/route.ts:12-29,74-84`; `src/app/api/routines/assign/[id]/route.ts:15-30`; `src/app/api/onboarding/assign-routine/route.ts:27-60`.
- Duplicar/asignar/desactivar planes de otro gym.
- **Aceptación:** validar gym del plan, del usuario y de la asignación; tests cross-gym.

### ADM-03 — Clases sin gymId, sin CRUD y con fuga de reservas

- **Alta / multi-tenant + feature.** `src/app/api/classes/route.ts:5-49`; `prisma/schema.prisma:527-541`; `src/app/classes/page.tsx:27-45`; `classes-view.tsx:186-215`.
- Todas las clases/reservas visibles; ADMIN no crea/edita/cancela ni ve roster.
- **Aceptación:** `Class.gymId` obligatorio; lecturas/CRUD por gym; roster autorizado; tests.

### ADM-04 — Ejercicios globales: permisos y cascada

- **Alta / integridad.** `src/app/api/exercises/route.ts:64-88`; `prisma/schema.prisma:438-451,472-492`; `src/app/api/exercises/[id]/route.ts:48-61,143-169`; `src/app/admin/gym-management/page.tsx:54-61`.
- ADMIN/TRAINER crean catálogo global; borrar un ejercicio lo quita de rutinas de todos los gyms; ejercicio nuevo se ve activo pero no tiene GymExercise.
- **Aceptación:** catálogo global solo SUPER_ADMIN o provisión GymExercise al crear; borrado bloqueado/soft-delete; test crear → rutina → miembro lo ve.

### ADM-05 — Notificaciones cross-gym

- **Alta / aislamiento.** `src/app/api/notifications/send/route.ts:41-67`; `src/app/api/notifications/route.ts:58-81`; `src/app/api/notifications/[id]/route.ts:48-57`.
- ADMIN envía/borra notificaciones de usuarios de otro gym.
- **Aceptación:** targets del gym propio; TRAINER clientes; SUPER global; tests.

### ADM-06 — Lecturas cross-gym/PII

- **Media / privacidad.** `src/app/api/members/search/route.ts:23-27`; `src/app/api/gym-equipment/route.ts:18-28`; `src/app/api/recommended-routines/route.ts`; `src/app/api/routines/route.ts:23-42`; `src/app/api/routines/[id]/route.ts:18-48`; `src/app/api/routine-splits/[id]/route.ts:29-78`.
- Enumeración de miembros, equipamiento y rutinas de otras sedes.
- **Aceptación:** scope por gym/asignación; endpoints públicos sin datos internos.

### ADM-07 — DELETE check-in sin gym

- **Media / integridad.** `src/app/api/check-ins/[id]/route.ts:21-31`.
- **Aceptación:** ADMIN solo check-ins de su gym; test cross-gym.

### ADM-08 — Cobro manual en vencida no renueva

- **Media / P-06/P-07.** `src/components/admin/membership-panel.tsx:401-415`; `src/app/api/payments/manual/route.ts:49-76`; `src/lib/membership-status.ts:48-50`.
- Cobra y queda vencida; no puede reservar.
- **Aceptación:** en Vencidas exigir Renovar primero o que el cobro renueve server-side; test.

### ADM-09 — Planes inactivos, duplicados 500 y precio retroactivo

- **Media / contradicción.** `src/app/api/memberships/route.ts:60-78`; `src/lib/membership-dates.ts:42-47`; `src/app/api/membership-plans/route.ts:83-87`; `src/app/api/membership-plans/[id]/route.ts:64`; `src/components/admin/membership-panel.tsx:344`.
- Plan inactivo usable; nombre duplicado 500; precio histórico cambia.
- **Aceptación:** bloquear plan inactivo en alta/renovación; 409 de duplicado; snapshot/aviso de precio.

### ADM-10 — Alta de membresías solo API y duplicado 500

- **Media / feature + bug.** `src/app/api/memberships/route.ts:80-92`; `prisma/schema.prisma:301`; `membership-panel.tsx:245-278,396-445`.
- **Aceptación:** UI de alta miembro+plan activo; duplicado → renovación o 409.

### ADM-11 — ADMIN no edita rutinas de trainers

- **Media / feature.** `src/app/admin/gym-management/page.tsx:101-111`; `src/components/admin/routine-management.tsx:496-514`; `src/app/api/routines/[id]/route.ts:9-16`; `src/app/api/routine-splits/route.ts:17-24`.
- **Aceptación:** decisión: permitir ADMIN en rutinas del gym o renombrar/ocultar acciones; tests.

### ADM-12 — KPIs contradictorios

- **Media / métricas.** `src/app/dashboard/page.tsx:285-300,368-374`.
- “Nuevos miembros” incluye TRAINER; “Total miembros” incluye staff; “por vencer” incluye impagas; sin gym cae a pagos globales.
- **Aceptación:** solo MEMBER; excluir impagas de “por vencer” o definir; sin fallback global.

### ADM-13 — isGymOwner vs ADMIN

- **Media / UX+permisos.** `src/proxy.ts:66-69`; `shell.tsx:69-73`; `admin/memberships/page.tsx:16`; APIs que rechazan MEMBER.
- Owner ve acciones que redirigen/403.
- **Aceptación:** decidir si owner debe ser ADMIN; ocultar/deshabilitar acciones; tests.

### ADM-14 — Pagos legacy sin membershipId

- **Baja / D-07.** `src/app/api/payments/route.ts:86-111`; `membership-panel.tsx:120-130,299`.
- Pago legacy aparece en todas las membresías del usuario; target ambiguo.
- **Aceptación:** backfill; eliminar fallback o cola separada; test.

### ADM-15 — Validaciones incompletas

- **Baja/Media.** `routine-management.tsx:851-887`; `split-exercises/route.ts:6-15`; `routine-splits/route.ts:6-15`; `classes/route.ts:33-49`; `membership-plan-manager.tsx:300-308`; `exercise-management.tsx:492-516`.
- Series/peso/descanso sin mínimo, duración negativa, capacity/duration inválidos, moneda arbitraria, URLs sin validar.
- **Aceptación:** Zod min/enums/ISO/URL; 400 con campo; tests.

### ADM-16 — Botones icon-only sin aria-label

- **Baja / a11y.** `exercise-management.tsx:324-356`; `routine-management.tsx:489-515,545-565,592-600`.
- **Aceptación:** aria-label descriptivo y foco visible.

## Preguntas para el juez

1. ¿ADMIN edita/elimina rutinas de sus trainers o solo las asigna?
2. ¿Catálogo de ejercicios global exclusivo de SUPER_ADMIN o ADMIN puede crear/borrar global?
3. ¿Cobro manual en vencida permitido o exige renovar primero?
4. ¿ADMIN puede override directo de paymentConfirmed/status/fechas sin Payment?
5. ¿Clases por gym y gestionadas por ADMIN o TRAINER?
6. ¿Owner sin rol ADMIN opera el gym o se le asigna ADMIN?
7. ¿Plan inactivo bloquea altas/renovaciones? ¿Precio histórico se versiona/snapshot?
8. ¿Pagos legacy sin membershipId se backfillean, cola separada o descartan?
9. ¿ADMIN crea membresías/da alta miembros desde su panel o queda en trainer?
10. ¿KPIs excluyen staff/impagos? ¿Se elimina fallback global de pagos?

## Features faltantes

Directorio y alta de miembros; alta/asignación de membresías; detalle/edición de membresía; ledger completo; CRUD de clases y roster; gestión de trainers; perfil del gym; comunicación segmentada; check-in/asistencia; biblioteca de rutinas del gym; duplicar/archivar planes y versionar precios; métricas por período/plan/método; paginación/búsqueda server-side; audit log.

## Ya resuelto en la rama

Scope dashboard/membresías lectura/pagos/planes/equipamiento; tabs D-02; renovación server-side; Payment source of truth; target membershipId; cobro manual con Payment; planes CRUD/409; equipamiento por gym/selector; registro solo MEMBER; alta admins; ciclo de gyms; E2E 65/65.

## Límites

Auditoría estática; no se ejecutó la app. El E2E 65/65 no cubre planes ADMIN, alta de membresías, trainers, clases, aislamiento cross-gym ni notificaciones ADMIN.
