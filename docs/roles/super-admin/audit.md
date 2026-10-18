# Auditoría SUPER_ADMIN — `fix/validation-batch-1`

Root: `.kilo/worktrees/validation-integration`
Modo: read-only. No se ejecutaron fixes.
Base: `docs/quality/role-quality-loop.md`, `docs/decisions/validation-fixes.md`, `VALIDATION_REPORT.md`.

## Scope

El SUPER_ADMIN es el rol de plataforma: gym base, catálogo global, permisos, gimnasios, usuarios y métricas. Hoy su superficie real es menor que la esperada y comparte poder con ADMIN.

Puede: dashboard global, crear gyms, toggle `showMachineNumbers`, catálogo global de ejercicios/rutinas, equipamiento del gym base, membresías globales, revisión inline de comprobantes, stats de plataforma, borrar check-ins, notificar a un usuario.

No puede: área `/super-admin` (redirige), planes de membresía, crear membresías, asignar rutinas, entrar a `/coach/payments`, configurar equipamiento de otras sedes.

## Ya resuelto en la rama (no reabrir)

- IDOR de `PATCH /api/memberships/[id]` (F-11/D-08).
- Renovación server-side (F-07/D-01).
- Tabs INACTIVE/Vencidas (F-04/D-02).
- `Payment` como fuente de verdad en upload/rechazo (F-05/F-06/D-07).
- Superadmin dueño del gym base y con `gymId`.
- Equipamiento por gym y custom persistido.
- Revisión inline de comprobantes y cola separada.

## Hallazgos vigentes

### SA-01 — Acciones de plataforma no exclusivas del SUPER_ADMIN

- **Severidad/tipo:** Alta / permisos.
- **Evidencia:** `src/app/api/gyms/route.ts:24-33`; `src/app/api/gyms/[id]/route.ts:33-43,69`.
- **Impacto:** cualquier ADMIN crea, renombra, desactiva o configura cualquier gym.
- **Aceptación:** `POST/PATCH /api/gyms` solo SUPER_ADMIN (o owner para campos no críticos); ADMIN 403; test con dos gyms.

### SA-02 — Sin aislamiento por gym para ADMIN

- **Severidad/tipo:** Alta / multi-tenancy.
- **Evidencia:** `src/app/admin/memberships/page.tsx:14-50`; `src/app/dashboard/page.tsx:277-334`; `src/app/admin/gym-management/page.tsx:79-94`; `src/app/api/payments/pending/route.ts:40-43`; `src/app/api/routines/assign/route.ts:13-30`.
- **Impacto:** un ADMIN ve y opera datos de otras sedes.
- **Aceptación:** queries/mutaciones de ADMIN filtradas por `user.gymId`; SUPER_ADMIN global; test con dos gyms.

### SA-03 — Registro público crea ADMIN sin gym

- **Severidad/tipo:** Alta / seguridad.
- **Evidencia:** `src/app/api/auth/register/route.ts:14,45-84`; `src/app/admin/gym-management/page.tsx:26`; `src/app/api/membership-plans/route.ts:52-60`.
- **Impacto:** un no autenticado se registra como ADMIN sin gym y, por SA-02, accede a datos globales.
- **Aceptación:** ADMIN solo con gym obligatorio o aprobación; rechazar ADMIN sin gym; tests.

### SA-04 — Gym creado desde plataforma sin provisioning

- **Severidad/tipo:** Alta / funcional.
- **Evidencia:** `src/app/api/gyms/route.ts:51-55`; comparar `src/app/api/auth/register/route.ts:86-103`; `src/app/api/routine-splits/[id]/route.ts:80-110`.
- **Impacto:** miembros sin ejercicios/equipamiento y gym sin planes.
- **Aceptación:** creación atómica con defaults (ejercicios, equipamiento, planes) o defaults perezosos; test crear gym → miembro ve catálogo.

### SA-05 — Borrar plan elimina membresías en cascada

- **Severidad/tipo:** Alta / pérdida de datos.
- **Evidencia:** `src/app/api/membership-plans/[id]/route.ts:49-62`; `prisma/schema.prisma:298`.
- **Impacto:** borrado silencioso de membresías e historial financiero huérfano.
- **Aceptación:** 409 si hay membresías o soft-delete; borrado físico solo SUPER_ADMIN con confirmación; test.

### SA-06 — IDOR en rechazo de pagos

- **Severidad/tipo:** Alta / seguridad.
- **Evidencia:** `src/app/api/payments/[id]/route.ts:22-25,160-175`; `src/app/api/payments/pending/route.ts:18-38`.
- **Impacto:** un TRAINER rechaza cualquier comprobante de otra sede/trainer.
- **Aceptación:** REJECT exige relación trainer-cliente o ADMIN/SUPER_ADMIN; 403; test.

### SA-07 — Pago manual no crea `Payment`; ingresos no reconcilian

- **Severidad/tipo:** Alta / contradicción D-07.
- **Evidencia:** `src/components/admin/membership-panel.tsx:137-160`; `src/app/api/memberships/[id]/route.ts:142-148`; `src/app/dashboard/page.tsx:280-286,420-423`.
- **Impacto:** ingresos de plataforma subestimados; sin trazabilidad de quién cobró; dashboards distintos.
- **Aceptación:** cobro manual crea `Payment COMPLETED` con método/referencia/confirmedBy/confirmedAt; una sola fuente de ingresos; test.

### SA-08 — Revisión inline por `userId`, no por pago/membresía

- **Severidad/tipo:** Media / datos y UX.
- **Evidencia:** `src/components/admin/membership-panel.tsx:108-111,268,325-361`; `src/app/api/payments/[id]/route.ts:48-61`; `prisma/schema.prisma:558-578`.
- **Impacto:** comprobante duplicado en todas las membresías del usuario; target ambiguo; segundo comprobante oculto.
- **Aceptación:** una fila por `Payment`; target pago→membresía (`membershipId`); test con dos membresías/comprobantes.

### SA-09 — “Membresías activas” cuenta impagas

- **Severidad/tipo:** Media / contradicción.
- **Evidencia:** `src/app/dashboard/page.tsx:417`; `src/app/api/admin/platform/route.ts:20`; `src/lib/membership-status.ts:29-42`.
- **Impacto:** KPI inflado; el miembro no puede reservar.
- **Aceptación:** incluir `paymentConfirmed: true`; test.

### SA-10 — SUPER_ADMIN bloqueado de `/coach/payments`

- **Severidad/tipo:** Media / rutas.
- **Evidencia:** `src/proxy.ts:17-21`; APIs permiten SUPER_ADMIN (`src/app/api/payments/[id]/route.ts:23`).
- **Impacto:** bandeja dedicada inaccesible; solo revisión inline.
- **Aceptación:** permitir SUPER_ADMIN o quitar expectativa; documentar; test.

### SA-11 — Equipamiento de otras sedes no operable por SUPER_ADMIN

- **Severidad/tipo:** Media / feature.
- **Evidencia:** `src/app/api/gym-equipment-activations/route.ts:21-35,62-72`; `src/app/admin/gym-management/page.tsx:18-23`; `src/app/api/gym-equipment/route.ts:51-66`.
- **Impacto:** no configura número/imagen/activación de otras sedes.
- **Aceptación:** selector de gym y `gymId` explícito para SUPER_ADMIN; autorización; test.

### SA-12 — SUPER_ADMIN excluido de acciones que la UI muestra

- **Severidad/tipo:** Media / permisos + UX.
- **Evidencia:** `src/app/api/membership-plans/route.ts:39`; `[id]/route.ts:26,56`; `src/app/api/memberships/route.ts:42`; `src/app/api/routines/assign/route.ts:13`; UI `src/components/admin/routine-management.tsx:489-495`.
- **Impacto:** botones terminan en 403; rol no es superconjunto de ADMIN.
- **Aceptación:** incluir SUPER_ADMIN o deshabilitar/ocultar; tests por endpoint.

### SA-13 — Falta ciclo de vida del gym y asignación de owner/admin

- **Severidad/tipo:** Media / feature.
- **Evidencia:** `src/app/super-admin/page.tsx:4-8`; `src/components/dashboard/super-admin-dashboard.tsx:195-240`; `src/app/api/gyms/route.ts:6-13`.
- **Impacto:** gyms huérfanos, sin owner/admin/planes; no hay edición/desactivación/transferencia.
- **Aceptación:** detalle de gym con editar/activar/desactivar/asignar owner; test de ciclo completo.

### SA-14 — `Gym.active` no se aplica

- **Severidad/tipo:** Media / contradicción.
- **Evidencia:** `src/app/api/gyms/[id]/route.ts:16-18,69`; solo `src/app/gym/[slug]/page.tsx:17-21` filtra.
- **Impacto:** gym inactivo sigue operando.
- **Aceptación:** definir y aplicar semántica (login/operaciones); test.

### SA-15 — Miembro auto-renueva ACTIVE vigente sin pagar

- **Severidad/tipo:** Media / negocio.
- **Evidencia:** `src/app/api/memberships/[id]/route.ts:97-133`; `src/lib/membership-dates.ts:50-59`.
- **Impacto:** extensión gratuita por API.
- **Aceptación:** self-renew solo EXPIRED/INACTIVE/SUSPENDED/CANCELLED, o renovación con `Payment PENDING`; test ACTIVE → 403.

### SA-16 — API de plataforma omite `showMachineNumbers`; toggle inconsistente

- **Severidad/tipo:** Menor / bug.
- **Evidencia:** `src/app/api/admin/platform/route.ts:50-57`; `src/components/dashboard/super-admin-dashboard.tsx:107-109,231-232,326-340`.
- **Impacto:** estado del toggle incorrecto tras crear gym.
- **Aceptación:** incluir el campo; label según acción; test.

### SA-17 — Gym duplicado devuelve 500; diálogo sin errores de campo

- **Severidad/tipo:** Menor / UX.
- **Evidencia:** `src/app/api/gyms/route.ts:45-53`; `src/components/dashboard/super-admin-dashboard.tsx:110-112,228-240`.
- **Impacto:** error no accionable; botón icon-only sin `aria-label`.
- **Aceptación:** 409 con error de campo; validar email/teléfono; `aria-label`; test.

### SA-18 — `GET /api/classes` público filtra PII

- **Severidad/tipo:** Menor / privacidad.
- **Evidencia:** `src/app/api/classes/route.ts:5-15`.
- **Impacto:** enumeración de reservas y emails.
- **Aceptación:** catálogo público sin PII o auth; test.

### SA-19 — Check-in acepta `gymId` del cliente

- **Severidad/tipo:** Menor / integridad.
- **Evidencia:** `src/app/api/check-ins/route.ts:48-53`; `prisma/schema.prisma:303-313`.
- **Impacto:** asistencia falsificable; métricas por sede no confiables.
- **Aceptación:** derivar gym del usuario/membresía; validar; test cross-gym.

### SA-20 — Flujo alternativo de pago crea membresía ACTIVE impaga y P2002

- **Severidad/tipo:** Menor / bug.
- **Evidencia:** `src/app/api/payments/route.ts:82-112`; `prisma/schema.prisma:300`.
- **Impacto:** reincorporación con mismo plan falla con 500; miembro activo sin pago.
- **Aceptación:** usar `receipt` con `membershipId` o manejar plan existente; 409/200 sin 500; test.

### SA-21 — Membresía vencida con comprobante forzada a “Pago sin confirmar”

- **Severidad/tipo:** Menor / contradicción D-02.
- **Evidencia:** `src/components/admin/membership-panel.tsx:113-124` vs `src/lib/membership-status.ts:29-42`.
- **Impacto:** desaparece de Vencidas; se oculta Renovar; contadores no reflejan D-02.
- **Aceptación:** decidir precedencia; si D-02, mostrarla en Vencidas con revisión; test.

## Preguntas para el juez

1. ¿SUPER_ADMIN debe ser superconjunto de ADMIN en planes, membresías y asignación de rutinas?
2. ¿Alta de gym/admin self-service o solo por SUPER_ADMIN/aprobación?
3. ¿`Gym.active=false` suspende operación o solo oculta el perfil público?
4. ¿Auto-renovación de ACTIVE vigente sin pago permitida?
5. ¿Comprobante de membresía vencida va a Pendientes o Vencidas?
6. ¿Ingresos solo desde `Payment COMPLETED`; todo cobro manual crea Payment?
7. ¿Confirmar comprobante de período nuevo activa/extiende, o primero renovar y luego pagar?
8. ¿SUPER_ADMIN opera `/coach/payments` o solo revisión inline?

## Features faltantes

- Área de plataforma real (`/super-admin`) con navegación y detalle por gym.
- Ciclo de vida de gyms: editar, activar/desactivar, transferir owner, asignar admin, checklist de provisioning.
- Gestión de usuarios/roles: buscar, cambiar rol, asignar gym, suspender, invitar, resetear acceso.
- CRUD de planes por gym con protección contra borrado en cascada.
- Crear/asignar membresías desde plataforma.
- Ledger de pagos, filtros, reembolsos, cobros manuales con `confirmedBy`, reconciliación y exportación.
- Audit log de acciones privilegiadas.
- Métricas por sede: activas pagas, ingresos, retención/churn, planes, asistencia.
- Catálogo global de equipamiento de sistema y rutinas recomendadas.
- Comunicación/broadcast.
- Onboarding masivo / importación.
- Privacidad/GDPR y exportación por usuario/gym.
- Cobertura de tests del rol (gyms, platform, planes, check-ins, flujos superadmin).

## Límites

Auditoría estática sobre la rama; no se ejecutó la app ni la suite. Los fixes F-04/05/06/07/11 y el seed del superadmin están en la rama. El foco vigente es el modelo de permisos y la superficie de plataforma.
