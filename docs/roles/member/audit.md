# Auditoría MEMBER — `fix/validation-batch-1`

Root: `.kilo/worktrees/validation-integration`
Modo: read-only, estática. Base: `docs/quality/role-quality-loop.md`, docs de SUPER/ADMIN/TRAINER, `VALIDATION_REPORT.md`.

## Scope

MEMBER opera solo sobre: onboarding/perfil propio, membresía/pagos propios, rutina asignada, clases/reservas de su gym, mediciones/progreso/check-ins propios, notificaciones y solicitudes de coach propias. No accede a `/admin`, `/coach`, catálogo global ni datos de otro miembro/gym.

## Hallazgos

### MBR-01 — Sin autoservicio de membresía ni entrada de navegación

- **Alta / flujo.** `layout/shell.tsx:46-88` sin Membresía; `member-dashboard.tsx:128-166` StatCard sin href; `membresia-content.tsx:46-69` empty state sin planes/CTA.
- Un miembro sin membresía no puede comprar/renovar desde la UI salvo el diálogo de solicitud de coach.
- **Aceptación:** elegir plan activo del gym, subir comprobante y renovar desde UI; entrada persistente; funciona para registro directo/invitación/vencida.

### MBR-02 — IDOR: MEMBER se autoasigna cualquier RoutinePlan

- **Alta / permisos.** `api/onboarding/assign-routine/route.ts:27-50,76-85` no valida plan para MEMBER; `routine-access.ts:25-31`; `api/routines/[id]/route.ts:35-61`.
- **Aceptación:** solo planes de plataforma permitidos/generados para él y de su gym; 403/404; tests cross-member/gym.

### MBR-03 — Onboarding genera ejercicios no habilitados en el gym

- **Alta / integridad.** `api/fitness-coach/route.ts:410-438,518-575` usa pool global; `routine-splits/[id]/route.ts:86-97` filtra `GymExercise.active`.
- El plan muestra N ejercicios pero entrena menos.
- **Aceptación:** generar solo con catálogo activo del gym (o aprovisionar); contador coincide; test catálogo restringido.

### MBR-04 — Loop por `onboardingCompleted` stale en JWT

- **Alta / sesión.** `proxy.ts:54-61`; `lib/auth.ts:74-90`; `onboarding/page.tsx:269-333,363-370,406-413`; `api/onboarding/route.ts:168-184`.
- **Aceptación:** gate con DB o `updateSession` tras POST/asistido; refresh sin loop; test.

### MBR-05 — `/api/payments` 500 con membresía EXPIRED/INACTIVE del mismo plan

- **Alta / bug.** `api/payments/route.ts:86-96,114-129` solo reutiliza ACTIVE impaga; unique `[userId,planId]`; 500 en `:170-173`.
- **Aceptación:** 409 accionable o renovar; nunca 500; test.

### MBR-06 — Pagar membresía vencida deja “Pagado” pero vencido

- **Media / negocio.** `membresia-content.tsx:80-114`; `payments/[id]/route.ts:126-135`; `payments/route.ts:86-96`.
- **Aceptación:** renovación previa o período correcto; confirmar no deja membresía pagada inutilizable; test.

### MBR-07 — Comprobante legacy acepta planes de otro gym

- **Media / tenant.** `api/payments/route.ts:57-60,114-146`; usuario sin `gymId` en `:27`.
- **Aceptación:** `plan.gymId === user.gymId` (SUPER con gym); 403/404; test.

### MBR-08 — Solicitud PENDING se muestra como coach asignado

- **Media / estado.** `dashboard/page.tsx:56-63,123-124,172-177`.
- **Aceptación:** `hasCoach` solo `assignedTrainerId`/ACCEPTED; PENDING como pendiente; test.

### MBR-09 — Estado de membresía ignora `paymentConfirmed`/`endDate`

- **Media / contradicción.** `member-dashboard.tsx:88,136-151`; `dashboard/page.tsx:114-141`; `membership-card.tsx:87-89`; helper `membership-status.ts:29-42`.
- **Aceptación:** estado efectivo en dashboard/card; coincide con reservas; tests impaga/vencida.

### MBR-10 — Notificaciones sin acciones y deep link de pago incorrecto

- **Media / UX.** `notifications/page.tsx:86-90`; `notification-list.tsx:99-104`; `shell.tsx:191-204` manda PAYMENT a `/coach/payments`; `proxy.ts:17-21`.
- **Aceptación:** TRAINER_REQUEST abre diálogo; PAYMENT a `/membresia` o `/profile/payments`; bandeja alcanzable; tests.

### MBR-11 — MEMBER cancela reserva `ATTENDED`

- **Media / integridad.** `api/bookings/route.ts:141-152`; `api/bookings/[id]/route.ts:99-114`.
- **Aceptación:** solo CONFIRMED→CANCELLED; ATTENDED 409/403; test.

### MBR-12 — Perfil solo edita nombre/teléfono

- **Media / feature.** `profile-form.tsx:200-250,269-373`; `actions/profile.ts:8-31,58-68` soporta más; `api/profile/route.ts:16-24`.
- **Aceptación:** editar campos personales/salud permitidos con validación; test.

### MBR-13 — Medición solo-perímetros no se guarda

- **Media / validación.** `progress/page.tsx:184-193` exige peso/altura/grasa/músculo.
- **Aceptación:** cualquier valor numérico habilita; test cintura.

### MBR-14 — Autorenovación ignora `plan.active`

- **Media / política.** `api/memberships/[id]/route.ts:139-171`; contraste alta `memberships/route.ts:64-69`.
- **Aceptación:** plan inactivo 409; override ADMIN/SUPER; test.

### MBR-15 — Registro sin gym asigna el primer gym activo

- **Media / tenant.** `api/auth/register/route.ts:40-49`; `register/page.tsx:64`.
- **Aceptación:** exigir contexto/confirmación de gym; corregir sede; tests.

### MBR-16 — `GET /api/exercises/[id]` público expone planes

- **Media / privacidad.** `api/exercises/[id]/route.ts:61-86` sin auth, incluye `splitExercises→split→plan`.
- **Aceptación:** auth y catálogo del gym/plan autorizado, sin planes; test anónimo 401/cross-gym.

### MBR-17 — CTAs de trainer visibles para MEMBER

- **Media / UX.** `exercise/[id]/page.tsx:79-85,118-120`; `routines/new/page.tsx:31-110` sin guard; `proxy.ts:17-21`.
- **Aceptación:** MEMBER sin CTAs; `/routines/new` guard; test.

### MBR-18 — Check-in sin UI, elegibilidad ni unicidad diaria

- **Media / feature.** `api/check-ins/route.ts:37-70`; unique por timestamp `schema.prisma:316`; sin página.
- **Aceptación:** UI; una/día; membresía confirmada; tests.

### MBR-19 — Rutas asistidas ADMIN cross-gym

- **Alta / PII.** `api/onboarding/route.ts:21-36`; `api/body-measurements/route.ts:70-84`; `api/fitness-coach/route.ts:466-479`.
- **Aceptación:** target `gymId === admin.gymId`; SUPER explícito; 403/404; tests dos gyms.

### MBR-20 — Receipt no valida método ni estado

- **Baja / validación.** `api/payments/receipt/route.ts:36,46-55,98-110`.
- **Aceptación:** Zod método; 400; definir confirmada/vencida; tests.

### MBR-21 — YAPE falta en formulario/labels

- **Baja / UX.** `payment-form.tsx:33-37`; `trainer-request-dialog.tsx:175`; `membership-card.tsx:66-72`.
- **Aceptación:** métodos/labels consistentes.

### MBR-22 — Historial no muestra motivo de rechazo

- **Baja / UX.** `profile-payments.tsx:73-125`; API sí devuelve `notes`.
- **Aceptación:** mostrar `notes`/fecha revisión; test.

### MBR-23 — Reasignar misma rutina 500 por unique

- **Baja / idempotencia.** `api/onboarding/assign-routine/route.ts:76-85`; unique `schema.prisma:470`.
- **Aceptación:** reactivar o 409; test.

### MBR-24 — Workout log acepta split/ejercicios arbitrarios

- **Baja / integridad.** `api/workout-logs/route.ts:79-99`.
- **Aceptación:** split asignado activo + ejercicios del split; 400/403; test.

### MBR-25 — Botones icon-only sin label

- **Baja / a11y.** `workout/exercise-card.tsx:67-86`; F-10 vigente.
- **Aceptación:** `aria-label`, foco; evaluar F-10.

## Preguntas al juez

1. ¿Autoasignación de rutina solo plantillas de plataforma del gym?
2. ¿Entrenar/registrar logs exige membresía paga o solo reservar?
3. ¿Primera membresía autoservicio o solo ADMIN/coach?
4. ¿Check-in autoservicio y con membresía paga?
5. ¿Autorenovación de plan inactivo se bloquea?
6. ¿Estado mostrado: almacenado o efectivo?
7. ¿Una sola membresía vigente por miembro?
8. ¿Perfil editable completo o solo nombre/teléfono?

## Features faltantes

Compra/renovación autoservicio; navegación a Membresía/Notificaciones; check-in QR/botón; historial real de entrenamientos; UI fotos de progreso; edición/borrado de mediciones; perfil completo; solicitud de coach iniciada por miembro; `autoRenew`; detalle de pago con motivo; deep links; waitlist; Stripe UI; preferencias de notificaciones/recuperación.

## Ya resuelto

Payment source of truth; `paymentConfirmed` en reservas/admin/coach; aceptación de coach transaccional same-gym; desasignación; catálogo por gym; reservas same-gym/activas/no propias; scopes de rutinas y notificaciones; renovación server-side; onboarding F-08; E2E 65/65.

## Límites

Auditoría estática; E2E con un solo gym. No cubre autoservicio inicial, plan ajeno, catálogo restringido, JWT stale, cancelar ATTENDED, asistido cross-gym ni `/notifications`.
