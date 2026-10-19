# Auditoría TRAINER — `fix/validation-batch-1`

Root: `.kilo/worktrees/validation-integration`
Modo: read-only. No se ejecutaron fixes.
Base: `docs/quality/role-quality-loop.md`, `docs/roles/{super-admin,admin}/{audit,decisions}.md`, `docs/decisions/validation-fixes.md`, `VALIDATION_REPORT.md`.

## Scope

TRAINER es coach de un gym: clientes asignados/aceptados, rutinas propias, clases propias, comprobantes de sus clientes, invitaciones, solicitudes, onboarding asistido, perfil y notificaciones. No opera membresías/planes, catálogo global, equipamiento ni datos de otro gym/trainer.

## Hallazgos

### TRN-01 — Búsqueda/solicitud/aceptación cross-gym

- **Alta / aislamiento.** `api/members/search/route.ts:23-27`; `api/trainer/clients/route.ts:62-92`; `api/user/trainer-requests/[id]/route.ts:105-118`; `api/payments/[id]/route.ts:107-147`; `lib/trainer-client.ts:3-20`.
- Un trainer de gym A busca/solicita/queda vinculado a miembro de gym B y accede a PII/mediciones/pagos.
- **Aceptación:** búsqueda/solicitud/aceptación/pago limitados al mismo gym; 403/404; tests con dos gyms.

### TRN-02 — Lectura/eliminación de rutinas sin scope

- **Alta / IDOR.** `app/routines/[id]/page.tsx:16-46,99-108`; `api/routines/[id]/route.ts:18-49`; `api/routine-splits/[id]/route.ts:29-73`.
- Cualquier TRAINER/ADMIN elimina o lee rutinas ajenas por ID; MEMBER lee planes.
- **Aceptación:** lectura/eliminación solo owner, SUPER, admin del gym según política o miembro asignado; UI sin acciones; tests cross.

### TRN-03 — Aceptar solicitud no asigna `assignedTrainerId`

- **Alta / estado inconsistente.** `api/user/trainer-requests/[id]/route.ts:113-118`; `lib/trainer-client.ts:3-20`; `coach/clients/page.tsx:18-23`; `api/trainer/clients/[id]/route.ts:22-24,84`; `dashboard/page.tsx:184-186`.
- Cliente aceptado aparece en lista pero su ficha/DELETE da 404, no cuenta en KPIs y no puede desasignarse.
- **Aceptación:** una sola definición de cliente; al aceptar setear `assignedTrainerId` o no listar no asignados; lista/ficha/KPIs consistentes; test.

### TRN-04 — Personalizar duplica y falla en la segunda vez

- **Media / bug.** `coach/clients/[id]/page.tsx:480-491`; `coach/clients/[id]/personalize/page.tsx:30-50`; `api/routines/duplicate/route.ts:76-84`; `schema.prisma:420` (`@@unique([name,userId])`).
- Cada clic crea copia y desasigna la anterior; segunda vez P2002/500.
- **Aceptación:** personalización idempotente/reutiliza copia o nombre único con 409; test dos veces.

### TRN-05 — Estado activo ignora paymentConfirmed

- **Media / contradicción.** `dashboard/page.tsx:192-231`; `coach/clients/page.tsx:69-71`; `coach/clients/[id]/page.tsx:154-156`; helper correcto `lib/membership-status.ts:29-42`.
- Impaga aparece activa en coach/KPIs.
- **Aceptación:** usar helper (ACTIVE + endDate + paymentConfirmed) en dashboard/lista/ficha; test impaga.

### TRN-06 — Builder usa catálogo global, no el habilitado del gym

- **Media / integridad.** `routines/new/page.tsx:41-45`; `api/exercises/route.ts:45-55`; `api/routines/route.ts:79-115`; `api/split-exercises/route.ts:54-64`; miembro filtra `GymExercise` en `api/routine-splits/[id]/route.ts:80-91`.
- Trainer arma rutina con ejercicios desactivados; miembro ve rutina incompleta.
- **Aceptación:** builder/APIs usan `GymExercise.active` del gym; 400 al agregar deshabilitado; test.

### TRN-07 — Clases: sin edición/cancelación/roster/asistencia

- **Media / feature + permisos.** `api/classes/route.ts:15-84` solo GET/POST; no `classes/[id]`; `coach-dashboard.tsx:756-796`; `classes-view.tsx:86-215`; `api/bookings/[id]/route.ts:43-64`.
- Coach no corrige/cancela clase, no ve inscriptos ni asistencia.
- **Aceptación:** PATCH/DELETE clase scope trainer propio/admin gym; roster; asistencia; tests.

### TRN-08 — Creación de rutinas sin validación y duplicado 500

- **Media / validación.** `api/routines/route.ts:58-115`; `schema.prisma:420`.
- Sin rangos; nombre duplicado P2002/500; UI toast genérico.
- **Aceptación:** Zod (frecuencia 1-7, sets≥1, reps≥1, peso≥0, rest≥0), P2002→409 campo; tests.

### TRN-09 — Perfil profesional sin UI

- **Media / feature.** `api/coach-profile/route.ts:7-92`; `profile/page.tsx:17-38`; `profile-form.tsx:215-250`; miembro lee bio en `trainer-request-dialog.tsx:252-270`.
- Coach no completa bio/especialidades/certificaciones desde UI.
- **Aceptación:** sección profesional TRAINER validada/persistida; miembro ve; test.

### TRN-10 — Pago por solicitud aceptada usa ruta legacy sin membershipId

- **Media / integridad.** `trainer-request-dialog.tsx:165-183`; `api/payments/route.ts:86-111`; `api/payments/[id]/route.ts:78-104`; notificación `:114-130`.
- Target ambiguo; 409 con dos membresías; cliente directo no notifica.
- **Aceptación:** todo comprobante con membershipId (`receipt` o legacy seteado); notificar trainer asignado/aceptado; tests.

### TRN-11 — Búsqueda promete nombre pero solo busca email

- **Media / UX.** `api/members/search/route.ts:25-27`; copy `coach-dashboard.tsx:437-445`.
- Buscar por nombre no encuentra.
- **Aceptación:** nombre o email, case-insensitive, mismo gym; tests.

### TRN-12 — Reenviar solicitud rechazada devuelve 500

- **Media / bug.** `api/trainer/clients/route.ts:80-92`; `schema.prisma:617` unique.
- **Aceptación:** reactivar rechazada o 409 accionable; test.

### TRN-13 — Sin acción para desasignar cliente

- **Media / feature + bug.** API `api/trainer/clients/[id]/route.ts:72-96`; UI solo GET `coach/clients/[id]/page.tsx:136`; DELETE exige assigned.
- **Aceptación:** “Desasignar” con confirmación, válido asignados/aceptados; notificación; test.

### TRN-14 — Invitaciones vencidas sin revocación y “copiado” compartido

- **Media / UX.** `api/trainer/invites/route.ts:19-24`; `coach-dashboard.tsx:570-590,326-335`.
- Links vencidos copiables; un solo estado copied; sin revocar.
- **Aceptación:** derivar EXPIRED, ocultar copia, estado por fila, revocación; test.

### TRN-15 — Reservas sin gym y staff sin regla

- **Media / aislamiento.** `api/bookings/route.ts:38-99`; `classes-view.tsx:186-215`.
- TRAINER reserva clase de otro gym y sin membresía.
- **Aceptación:** clase del gym del usuario; definir staff; test cross-gym.

### TRN-16 — Bandeja de comprobantes sin contexto ni historial

- **Media / UX.** `coach/payments/page.tsx:13-22,126-165,67-89`.
- Sin plan/período/tipo/referencia; rechazo con nota fija; sin historial.
- **Aceptación:** mostrar membresía/plan/fechas/tipo/referencia/notas; historial; motivo editable; test.

### TRN-17 — Alta directa con contraseña visible y errores genéricos

- **Baja / UX+seg.** `coach-dashboard.tsx:996-1005` (type text); `:266-296` sin fieldErrors.
- **Aceptación:** password input, errores por campo; test.

### TRN-18 — Botones icon-only sin label y modal solo mouse

- **Baja / a11y.** `routine-editor-dialog.tsx:445-466,493-500`; `routines/new/page.tsx:174-181`; `coach-dashboard.tsx:437-445`; `coach/payments/page.tsx:229-240`.
- **Aceptación:** aria-label, foco, modal role dialog/Escape/teclado.

### TRN-19 — 500 por parse no controlado / validación invitaciones

- **Baja / robustez.** `api/trainer/clients/route.ts:59-60`; `api/payments/[id]/route.ts:31-32`; `api/trainer/invites/route.ts:40-48`.
- **Aceptación:** safeParse 400; validar email/teléfono; tests.

### TRN-20 — Sin empty state en `/classes`

- **Baja / UX.** `classes-view.tsx:142-143`.
- **Aceptación:** empty state con copy/acción; test.

## Preguntas para el juez

1. ¿“Cliente” nace al aceptar la solicitud o al confirmar el pago? ¿Aceptar setea `assignedTrainerId`?
2. ¿El vínculo trainer-cliente exige mismo gym? ¿Qué pasa con vínculos existentes?
3. ¿TRAINER solo crea clases o también edita/cancela/roster/asistencia?
4. ¿TRAINER crea miembros directos o solo invitaciones?
5. ¿Staff puede reservar clases como participante sin membresía?
6. ¿Ruta legacy `/api/payments` se migra a `receipt`/membershipId o se mantiene?
7. ¿Personalización de rutina: copia editable idempotente o versionado?
8. ¿Historial de pagos del coach: solo PENDING o histórico completo del cliente?
9. ¿Biblioteca de rutinas del gym: ver/duplicar de otros trainers o solo propias + SUPER?

## Features faltantes

CRUD/cancelación/roster/asistencia de clases; desasignar cliente; historial de solicitudes y reenvío; revocar/recrear invitaciones; perfil profesional; mensajería al cliente; detalle/historial de pagos; edición/reordenamiento de rutinas; biblioteca de plantillas del gym; búsqueda/filtros/paginación de clientes; empty states.

## Ya resuelto

Clases con gymId y listado scoped; Payment source of truth; target membershipId en receipt; scopes de pagos/rutinas/notificaciones; catálogo global solo SUPER; reserva concurrente; invitación expirada 410; onboarding asistido; E2E 65/65.

## Límites

Auditoría estática; no se ejecutó la app. E2E con un solo gym; no cubre cross-gym, trainers negativos, clases CRUD, roster, re-solicitud, segunda personalización.
