## 1. Modelo y migración

- [x] 1.1 Cambiar `MembershipPlan.price`, `Membership.planPrice` y `Payment.amount` a `Decimal(12,2)`.
- [x] 1.2 Agregar `MembershipPlanPriceHistory`.
- [ ] 1.3 Hacer `planPrice` nullable y backfillear desde el plan.
- [ ] 1.4 Helper de serialización monetaria para API/UI.

## 2. Validaciones de plan

- [x] 2.1 Zod compartido: precio >= 0, <= 1.000.000, 2 decimales; duración 1–3650; moneda PEN.
- [x] 2.2 Crear/editar solo ADMIN del gym o SUPER; default 409.
- [x] 2.3 Historial transaccional al cambiar precio/moneda.
- [x] 2.4 Delete con membresías 409; desactivar.

## 3. Pagos y snapshots

- [x] 3.1 Crear membresía con snapshot y usarlo en todos los pagos.
- [x] 3.2 Legacy: si la membresía existe, usar su snapshot; nunca el precio actual.
- [x] 3.3 Manual/receipt: monto y moneda del snapshot; ignorar amount del cliente.
- [x] 3.4 Renovación: snapshot vigente; si el precio cambió, notificar y exigir aceptación explícita.
- [x] 3.4a Plan gratuito: membresía con monto 0, sin comprobante.
- [x] 3.5 Pago pendiente inmutable ante cambio de precio.

## 4. UI

- [x] 4.1 Plan manager muestra validaciones y errores por campo.
- [x] 4.2 Membresía/checkout muestra precio, moneda y período del snapshot.
- [ ] 4.3 Historial de precios visible para ADMIN/SUPER.

## 5. Pruebas

- [x] 5.1 Unit: precios inválidos, redondeo, cross-gym, default.
- [x] 5.2 Unit: snapshot no cambia tras PATCH; renovación con precio nuevo exige aceptación y rechazo no renueva.
- [ ] 5.3 Unit: legacy/manual/receipt usan snapshot.
- [ ] 5.4 Integración: concurrencia PATCH vs pago y una membresía vigente.
- [ ] 5.5 E2E: admin cambia precio, miembro acepta/rechaza, nuevo miembro paga precio nuevo; plan gratuito sin comprobante.
- [x] 5.6 `npm run validate` y `npm run test:validation`.
