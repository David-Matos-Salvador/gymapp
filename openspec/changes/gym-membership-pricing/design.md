## Context

El pricing por gym ya existe (`MembershipPlan.gymId`, `price`, `currency`, `durationDays`) y las membresías guardan snapshots (`planPrice`, `planCurrency`, `planDurationDays`). Los gaps son de precisión, validación y consistencia del snapshot. Ver `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Dinero exacto y validado.
- Snapshot inmutable y usado por todos los caminos de pago.
- Historial de cambios de precio.
- Tests de aislamiento por gym y de concurrencia.

**Non-Goals:**

- Cupones, impuestos, prorrateo, Stripe UI, multi-moneda automática.

## Decisions

### 1. `Decimal(12,2)` en vez de `Float`

`MembershipPlan.price`, `Membership.planPrice` y `Payment.amount` pasan a `Decimal @db.Decimal(12,2)`. Los cálculos y comparaciones se hacen con `Prisma.Decimal`; la UI recibe string/number serializado explícitamente. Alternativa descartada: centavos `Int`; requiere conversión en todos los contratos y la API ya expone decimales.

### 2. Precio máximo y duración acotada

Validar `price > 0`, `<= 1_000_000`, máximo 2 decimales; `durationDays` entero 1–3650. El límite es configurable en constantes compartidas.

### 3. Snapshot siempre autoritativo

`Membership.planPrice` deja de usar `0` como “sin snapshot”: se vuelve nullable en migración y se completa con backfill. Todos los pagos usan `planPrice/planCurrency` de la membresía; el precio actual del plan solo se usa al crear/renovar.

### 4. Historial de precios

Nuevo `MembershipPlanPriceHistory` con `planId`, `oldPrice`, `newPrice`, `oldCurrency`, `newCurrency`, `changedById`, `createdAt`. Se crea dentro de la misma transacción que el PATCH cuando cambia precio o moneda.

### 5. Renovación con precio vigente

La renovación calcula fechas server-side y guarda el snapshot actual. La UI muestra precio y período antes de confirmar; no se acepta un monto del cliente.

### 6. Concurrencia

El PATCH de precio y la creación de pago se serializan por plan/membresía. Un pago pendiente mantiene su snapshot aunque el plan cambie; una nueva membresía toma el precio vigente al momento de crearse.

## Risks / Trade-offs

- **Migración Float→Decimal**: requiere backfill y revisar serialización JSON (Prisma Decimal no es JSON-safe por defecto) → helper `serializeMoney`.
- **Cambios de precio sin aviso**: el miembro puede ver un precio distinto al renovar → preview obligatorio y registro de historial.
- **Historial sin UI**: se implementa API y se muestra en el detalle de plan; si no, el dato igual queda para auditoría.
- **Planes con moneda distinta en el mismo gym**: se permite, pero el pago debe coincidir con el snapshot; si el negocio quiere una sola moneda por gym, agregar validación.

## Migration Plan

1. Agregar columnas Decimal y `MembershipPlanPriceHistory`.
2. Backfill de snapshots desde el plan para membresías con `planPrice=0`.
3. Cambiar APIs/UI a `serializeMoney`.
4. Rollback: conservar columnas Float antiguas hasta validar; luego eliminarlas.

## Open Questions

Ninguna bloqueante. El alta de un plan gratuito no exige comprobante; si el gym quiere aprobación manual de ese plan, se resuelve con un flag futuro.
