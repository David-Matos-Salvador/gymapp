# Decisiones del juez — SUPER_ADMIN

Base: `docs/roles/super-admin/audit.md` (SA-01..SA-21), `docs/quality/role-quality-loop.md`, rama `fix/validation-batch-1`.

## Políticas

- **P-01:** SUPER_ADMIN es superconjunto operativo de ADMIN, siempre con gym explícito. ADMIN solo su `gymId`. TRAINER solo sus clientes. Sin suplantación.
- **P-02:** gyms solo los crea SUPER_ADMIN. ADMIN se crea por SUPER_ADMIN con `gymId` obligatorio. Registro público solo MEMBER. Sin ADMIN/TRAINER públicos.
- **P-03:** `Gym.active=false` suspende operación (login, escrituras, reservas, pagos), no solo el perfil público. Solo SUPER_ADMIN reactiva.
- **P-04:** auto-renovación de ACTIVE vigente bloqueada. Solo EXPIRED/INACTIVE/SUSPENDED/CANCELLED. Renovación anticipada solo con `Payment PENDING`.
- **P-05:** membresía vencida con comprobante va a **Vencidas**, según D-02; badge/revisión inline y Renovar visibles.
- **P-06:** ingresos solo desde `Payment COMPLETED`. Todo cobro manual crea `Payment` con `membershipId`, `confirmedBy/At`, método y referencia.
- **P-07:** flujo mínimo: renovar primero (fechas server-side, `paymentConfirmed=false`), subir/crear `Payment PENDING`, confirmar solo transiciona el pago y habilita la membresía.
- **P-08:** `/coach/payments` es la bandeja oficial con scope por rol; la revisión inline es un atajo al mismo endpoint.

## Decisiones

| ID    | Decisión | Sev.  | Criterio corto                                                                                |
| ----- | -------- | ----- | --------------------------------------------------------------------------------------------- |
| SA-01 | FIX      | Alta  | ADMIN no crea gyms ni edita `name`/`active` de ningún gym; solo campos no críticos de su gym. |
| SA-02 | FIX      | Alta  | ADMIN solo ve/muta datos de su `gymId`; SUPER_ADMIN global. Test con dos gyms.                |
| SA-03 | FIX      | Alta  | Registro público solo MEMBER. ADMIN se crea por SUPER_ADMIN con gym.                          |
| SA-04 | FIX      | Alta  | Crear gym aprovisiona ejercicios/equipamiento en una transacción.                             |
| SA-05 | FIX      | Alta  | Borrar plan con membresías → 409/soft delete; hard delete solo SUPER_ADMIN sin membresías.    |
| SA-06 | FIX      | Alta  | CONFIRM/REJECT con scope trainer-cliente/gym; 403 cruzado.                                    |
| SA-07 | FIX      | Alta  | Cobro manual crea `Payment COMPLETED`; ingresos solo Payment.                                 |
| SA-08 | FIX      | Alta  | `Payment.membershipId`; una fila por pago; target pago→membresía.                             |
| SA-09 | FIX      | Media | KPI “activas” exige `paymentConfirmed`.                                                       |
| SA-10 | FIX      | Media | SUPER_ADMIN puede entrar a `/coach/payments` con scope global.                                |
| SA-11 | FEATURE  | Media | Selector de gym para equipamiento; `gymId` explícito y autorizado.                            |
| SA-12 | FIX      | Media | SUPER_ADMIN incluido en planes/membresías/asignación; TRAINER sin CRUD de planes.             |
| SA-13 | FEATURE  | Media | `/super-admin` MVP con lista/detalle/ciclo de gym y asignación de owner/admin.                |
| SA-14 | FIX      | Alta  | Gym inactivo suspende login/escrituras; solo SUPER_ADMIN reactiva.                            |
| SA-15 | FIX      | Media | Miembro no renueva ACTIVE vigente; solo vencidas/inactivas.                                   |
| SA-16 | FIX      | Baja  | API de plataforma incluye `showMachineNumbers`; label coherente.                              |
| SA-17 | UX       | Baja  | 409 con errores de campo; validaciones y `aria-label`.                                        |
| SA-18 | FIX      | Media | `/api/classes` público sin PII; auth para reservas.                                           |
| SA-19 | FIX      | Media | `gymId` de check-in derivado/validado, no del cliente.                                        |
| SA-20 | FIX      | Media | Upload idempotente; renovación server-side; sin P500/ACTIVE impago.                           |
| SA-21 | FIX      | Media | Vencida + comprobante permanece en Vencidas (D-02).                                           |

## Workstreams

1. **WS1 — Seguridad y tenant (bloqueante):** helpers, SA-01/02/03/06/12/14/18/19, SA-10 al final.
2. **WS2 — Integridad y pagos (bloqueante):** migración `Payment.membershipId` + `onDelete Restrict`, SA-04/05/07/08/15/20/21/09.
3. **WS3 — Plataforma:** SA-13, SA-11, SA-16 API, alta de admin.
4. **WS4 — UX/métricas:** SA-17, SA-16 UI, estados, copy, docs.

## Diferido

Audit log, GDPR/exportación, broadcast, importación masiva, reembolsos/ledger avanzado, gestión completa de usuarios/roles y métricas de retención/churn. Se documentan en backlog.
