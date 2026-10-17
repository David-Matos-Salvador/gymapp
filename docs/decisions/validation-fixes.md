# Decisiones — Ronda de fixes de validación

Fecha: 2026-10-17
Alcance: F-04 a F-11 (bugs de la validación multi-usuario).
Juez: subagente read-only sobre `VALIDATION_REPORT.md`, reglas del proyecto y schema.

## D-01 — F-07 Renovación de membresía

La renovación se calcula en el servidor. El cliente no envía fechas autoritativas.

- `anchor = max(now, existing.endDate)`.
- Si `status = ACTIVE` y `endDate > now`: no cambiar `startDate`; `endDate = existing.endDate + plan.durationDays`; conservar `paymentConfirmed`.
- Si `EXPIRED`, `INACTIVE`, `SUSPENDED`, `CANCELLED` o `ACTIVE` vencida: `startDate = now`; `endDate = anchor + plan.durationDays`; `status = ACTIVE`; `paymentConfirmed = false`.
- Validar `durationDays >= 1`; nunca acortar un `endDate` futuro.
- Exponer `renew: true` (o endpoint dedicado) y devolver las fechas calculadas.
- Si se aceptan fechas explícitas, que sean solo override de ADMIN y validadas.

## D-02 — F-04 Membresías INACTIVE

Sin tab nuevo. Tres tabs mutuamente excluyentes:

- `Vencidas = status != ACTIVE OR endDate < now`
- `Pendientes = status = ACTIVE AND endDate >= now AND !paymentConfirmed`
- `Activas = status = ACTIVE AND endDate >= now AND paymentConfirmed`

En Vencidas mostrar badge real: `INACTIVE = "Inactiva"`, `EXPIRED = "Vencida"`, `SUSPENDED = "Suspendida"`, `CANCELLED = "Cancelada"`. Mostrar “Renovar” también en INACTIVE.

## D-03 — F-08 Onboarding 500

Combinación:

- `upsert` por `name` exacto como escritura atómica.
- `findFirst` case-insensitive antes del upsert.
- Capturar `P2002` y reconsultar case-insensitive.
- Canonicalizar los nombres del pool al spelling del seed; no agregar unique `lower(name)` en esta ronda.

## D-04 — F-01 Login

No alcanza con `method="post"`.

- Agregar `method="post"` y `action="/login"`.
- Bloquear el submit nativo hasta montar: `fieldset disabled={!mounted}` o renderizar el form solo tras el montaje.
- Mantener react-hook-form/onSubmit.
- Sin JS no debe navegar con credenciales en la URL.

## D-05 — F-09 Concurrencia de reservas

Transacción interactiva + lock pesimista de la fila `Class` (`SELECT ... FOR UPDATE`). No usar serializable.

Dentro del lock:

- Revalidar reserva del usuario: `CONFIRMED`/`ATTENDED` → 409; `CANCELLED` → update a `CONFIRMED`.
- Contar `CONFIRMED`, comparar con `capacity`, crear/actualizar.
- Mantener `@@unique([userId, classId])`; mapear P2002 a 409.
- Validar `classId` antes de consultar; timeout explícito.
- Reservar exige `status = ACTIVE`, `endDate > now` y `paymentConfirmed = true`.

## D-06 — F-03 Historial

Diferir como limitación conocida. Documentar en `BACKLOG.md`/`FEATURES_PENDIENTES.md`. No implementar en esta ronda.

## D-07 — F-05 / F-06 Pagos

`Payment` es la fuente de verdad; `Membership.paymentConfirmed` es compuerta de una vía.

- **Upload:** crear `Payment PENDING` y no modificar Membership (status, fechas, paymentConfirmed).
- **CONFIRM:** Payment `PENDING → COMPLETED`; setear `paymentConfirmed = true` en la membresía no confirmada; copiar método/referencia; no cambiar status/fechas. Si ya era true, no-op.
- **REJECT:** Payment `PENDING → FAILED`; la membresía no confirmada queda `false`; si ya era true no se revoca; no cambiar status/fechas.
- Aplicar solo a `payment.type = MEMBERSHIP`.
- Transición no-PENDING → 409.
- Target: membresía no confirmada del userId; 0 → no-op; >1 → 409.
- El branch sin archivo del payment form no puede setear `paymentConfirmed = true`.

## D-08 — F-11 IDOR de membresías

`PATCH /api/memberships/[id]` debe exigir ADMIN/SUPER_ADMIN para cambios arbitrarios. Si se permite auto-renovación, solo sobre la propia membresía y nunca aceptar `paymentConfirmed=true` desde el cliente.

## Propiedad de archivos

| Archivo                                                                                                  | Dueño                                               |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `src/app/api/payments/receipt/route.ts`, `payments/[id]/route.ts`, `payment-form.tsx`                    | Payments (F-05/F-06)                                |
| `src/app/api/memberships/[id]/route.ts`, `membership-panel.tsx`, `membership-card.tsx`, helper de fechas | Membresías (F-04/F-07/F-11)                         |
| `src/app/api/bookings/route.ts`                                                                          | Booking race (F-09 + elegibilidad paymentConfirmed) |
| `src/app/api/fitness-coach/route.ts`, `prisma/seed.ts` (canonicalización)                                | Onboarding (F-08)                                   |
| `src/app/login/page.tsx`, chart de progreso, docs de backlog                                             | Hardening (F-01/F-02; F-03/F-10 diferidos)          |

## Diferidos

- **F-03** historial de entrenamientos.
- **F-10** CardTitle semántico (cambio transversal de UI/a11y; evaluar en una ronda aparte).

## Riesgos conocidos

- El copy del payment form puede cambiar a “Comprobante enviado, pendiente de revisión”; actualizar la aserción del validation solo para reflejar el comportamiento nuevo, sin debilitar la comprobación de `paymentConfirmed=false`.
- `Payment.membershipId` es follow-up; sin él, resolver la membresía no confirmada por userId y devolver 409 si hay ambigüedad.
- No commitear `VALIDATION_REPORT.*`, screenshots ni `.env.local` desde los worktrees.
