## Purpose

Fija las reglas de precio de membresías por gimnasio y garantiza que el monto cobrado sea el correcto, consistente y auditable.

## ADDED Requirements

### Requirement: Precio por gimnasio

Cada plan SHALL pertenecer a un gimnasio y tener precio, moneda y duración propios. Solo un ADMIN del gimnasio o SUPER_ADMIN SHALL crear o modificar planes de ese gimnasio. El gimnasio por defecto SHALL NOT tener planes.

#### Scenario: Admin de otro gym

- **WHEN** un ADMIN del gym A intenta crear o editar un plan del gym B
- **THEN** la API devuelve 403 y no modifica datos

#### Scenario: Gym por defecto

- **WHEN** se intenta crear un plan para el gimnasio por defecto
- **THEN** la API devuelve 409

### Requirement: Validación monetaria

El precio SHALL ser mayor a 0, con máximo dos decimales y un límite superior definido. La moneda SHALL ser una del conjunto permitido. La duración SHALL ser un entero positivo dentro de un rango razonable.

#### Scenario: Precio inválido

- **WHEN** se envía precio 0, negativo, NaN, infinito, con más de dos decimales o fuera de rango
- **THEN** la API devuelve 400 con error del campo `price`

#### Scenario: Duración inválida

- **WHEN** se envía duración 0, negativa, decimal o fuera de rango
- **THEN** la API devuelve 400 con error del campo `durationDays`

#### Scenario: Moneda inválida

- **WHEN** se envía una moneda no soportada
- **THEN** la API devuelve 400 con error del campo `currency`

### Requirement: Precisión monetaria

El sistema SHALL representar y persistir dinero sin `Float`, con precisión decimal o centavos, y SHALL calcular montos en el servidor.

#### Scenario: Redondeo

- **WHEN** un plan cuesta 19.99 y se genera un pago
- **THEN** el monto persistido es exactamente 19.99 y no un valor binario aproximado

#### Scenario: Cliente manipula el monto

- **WHEN** el cliente envía un `amount` distinto al precio del plan
- **THEN** el servidor ignora el valor del cliente y usa el precio canónico

### Requirement: Snapshot de membresía

Al crear una membresía SHALL guardarse el precio, moneda y duración vigentes del plan. Cambios posteriores del plan SHALL NOT alterar ese snapshot.

#### Scenario: Cambio de precio con membresía activa

- **WHEN** el gym sube el precio de un plan con miembros activos
- **THEN** las membresías existentes conservan su precio original y los pagos pendientes usan ese snapshot

#### Scenario: Renovación

- **WHEN** el miembro renueva
- **THEN** la UI muestra el precio vigente y la membresía renovada guarda un nuevo snapshot

### Requirement: Pago consistente con el snapshot

Todo pago de membresía SHALL usar el snapshot de la membresía objetivo. El flujo legacy SHALL reutilizar el snapshot si la membresía ya existe y SHALL NOT cobrar el precio actual del plan.

#### Scenario: Pago legacy con snapshot

- **WHEN** existe una membresía no confirmada con snapshot 100 y el plan ahora cuesta 120
- **THEN** el pago se crea por 100, no por 120

#### Scenario: Pago manual

- **WHEN** un ADMIN registra un pago manual
- **THEN** el monto y la moneda se toman del snapshot y no de un campo libre

#### Scenario: Receipt

- **WHEN** el miembro sube un comprobante
- **THEN** el monto/moneda del pago coinciden con la membresía objetivo

### Requirement: Historial de precios

Cada cambio de precio SHALL registrar quién lo hizo, cuándo, el valor anterior y el nuevo.

#### Scenario: Edición de precio

- **WHEN** un ADMIN cambia el precio de un plan
- **THEN** se crea un registro de historial con actor, fecha y valores

### Requirement: Planes inactivos

Un plan inactivo SHALL NOT aceptar nuevas membresías ni autorenovaciones. Los pagos pendientes de una membresía existente SHALL poder resolverse según su snapshot.

#### Scenario: Alta con plan inactivo

- **WHEN** se intenta crear una membresía con un plan inactivo
- **THEN** la API devuelve 409

#### Scenario: Renovación con plan inactivo

- **WHEN** un miembro intenta renovar un plan inactivo
- **THEN** la API devuelve 409 y no crea pagos

### Requirement: Eliminación y desactivación

Un plan con membresías asociadas SHALL NOT eliminarse; SHALL desactivarse.

#### Scenario: Delete con historial

- **WHEN** se intenta eliminar un plan con membresías
- **THEN** la API devuelve 409 y sugiere desactivarlo
