## Why

Cada gimnasio ya puede crear planes con precio, pero el modelo usa `Float` para dinero, snapshots con sentinel `> 0` y no tiene historial de precios. Eso permite errores de redondeo, montos ambiguos y cambios de precio sin trazabilidad. Antes de exponer autoservicio de membresías conviene fijar las reglas de pricing.

## What Changes

- El precio del plan es por gimnasio y moneda; solo ADMIN de ese gym o SUPER_ADMIN puede crearlo/editarlo.
- El dinero se representa con precisión decimal (o centavos), no `Float`.
- Se validan rango, decimales, moneda y duración del plan.
- La membresía y el pago guardan un snapshot inmutable del precio/moneda/duración al crearse.
- Cambiar el precio de un plan no modifica membresías ni pagos existentes; la renovación usa el precio vigente y se muestra antes de confirmar.
- El pago legacy reutiliza el snapshot de la membresía existente; no el precio actual del plan.
- Se agrega historial de cambios de precio (quién, cuándo, valor anterior/nuevo).
- Membresías, pagos manuales y receipts validan que el monto/moneda coincidan con el snapshot.
- El gimnasio por defecto no admite planes.

## Capabilities

### New Capabilities

- `gym-membership-pricing`: precio por gimnasio, validación monetaria, snapshots, renovación e historial.

### Modified Capabilities

<!-- No hay specs previas en openspec/specs/. -->

## Impact

- Prisma: `MembershipPlan.price`, `Membership.planPrice`, `Payment.amount` y snapshots de moneda.
- APIs de planes, membresías, pagos legacy/manual/receipt y renovación.
- UI de planes, membresía y checkout.
- Migración/backfill de precios existentes y tests.

## Non-goals

- Cupones, descuentos, impuestos, prorrateos o multi-moneda automática.
- Precios por trainer o por clase.
- Cambio de precio retroactivo.
- Stripe Checkout en esta iteración.
