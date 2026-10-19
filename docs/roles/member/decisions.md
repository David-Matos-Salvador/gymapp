# Decisiones MEMBER — `fix/validation-batch-1`

Base: `docs/roles/member/audit.md` + veredicto del juez adversarial.
Estado: bloqueantes y lote acotado implementados y validados. Features de producto diferidas.

## Veredicto

| ID     | Veredicto                          | Estado                                                     |
| ------ | ---------------------------------- | ---------------------------------------------------------- |
| MBR-01 | CONFIRMED Alta (parcial)           | Implementado (navegación + primera membresía autoservicio) |
| MBR-02 | CONFIRMED Alta                     | Implementado                                               |
| MBR-03 | CONFIRMED Alta                     | Implementado                                               |
| MBR-04 | CONFIRMED Alta (parcial)           | Implementado                                               |
| MBR-05 | CONFIRMED Alta (dup SA-20)         | Implementado                                               |
| MBR-06 | CONFIRMED Media (dup ADM-08)       | Implementado                                               |
| MBR-07 | CONFIRMED Media                    | Implementado                                               |
| MBR-08 | CONFIRMED Media                    | Implementado                                               |
| MBR-09 | CONFIRMED Media (dup TRN-05/SA-09) | Implementado                                               |
| MBR-10 | CONFIRMED Media                    | Implementado                                               |
| MBR-11 | CONFIRMED Media                    | Implementado                                               |
| MBR-12 | DEFERRED feature                   | Backlog producto                                           |
| MBR-13 | CONFIRMED Media                    | Implementado                                               |
| MBR-14 | CONFIRMED Media (dup SA-15/ADM-09) | Implementado                                               |
| MBR-15 | CONFIRMED Media                    | Implementado                                               |
| MBR-16 | CONFIRMED Media                    | Implementado                                               |
| MBR-17 | CONFIRMED Media (UX)               | Implementado                                               |
| MBR-18 | DEFERRED feature                   | Backlog producto                                           |
| MBR-19 | CONFIRMED Alta (dup ADM-02/TRN-01) | Implementado                                               |
| MBR-20 | CONFIRMED Baja                     | Implementado                                               |
| MBR-21 | CONFIRMED Baja                     | Implementado                                               |
| MBR-22 | CONFIRMED Baja                     | Implementado                                               |
| MBR-23 | CONFIRMED Baja                     | Implementado                                               |
| MBR-24 | CONFIRMED Baja                     | Implementado                                               |
| MBR-25 | CONFIRMED Baja                     | Implementado                                               |

## Políticas

1. **Autoasignación de rutina.** MEMBER solo puede asignarse planes de plataforma (`SUPER_ADMIN`) con todos sus ejercicios activos en `GymExercise` de su gym. Un plan de otro miembro/trainer/gym devuelve 403. Reasignar el mismo plan es idempotente.
2. **Membresía para entrenar.** Entrenar la rutina y registrar `WorkoutLog` no exige membresía; reservar clases y check-in sí exigen `ACTIVE + endDate + paymentConfirmed`.
3. **Primera membresía autoservicio.** El miembro ve planes activos de su gym, elige uno, sube comprobante y queda `Payment PENDING`. La activación la confirma ADMIN/TRAINER/SUPER. TRAINER no crea membresías.
4. **Check-in.** Feature diferida. Antes de exponer UI: una vez por día calendario, membresía paga y `gymId` derivado del usuario.
5. **Plan inactivo.** MEMBER no puede autorenovar un plan inactivo (409). ADMIN/SUPER conservan override.
6. **Estado mostrado.** Estado efectivo: `ACTIVE` solo con `status=ACTIVE && endDate>now && paymentConfirmed`; impaga vigente → “Pago pendiente”; vencida → “Vencida”. No se muta el status por el paso del tiempo.
7. **Una membresía vigente.** Como máximo una `ACTIVE` con `endDate>now` y una no confirmada. Renovación extiende; cambio/alta con vigente devuelve 409.
8. **Perfil.** MEMBER edita sus datos personales/salud; email, rol, gym, coach y membresía son inmutables. La UI completa queda como feature (MBR-12).

## Implementación

### Seguridad/tenant

- `assign-routine`: plan de plataforma + catálogo activo del gym; upsert idempotente.
- `payments`: `plan.gymId === user.gymId`; rechaza membresía vencida/cerrada y segunda vigente; P2002 → 409.
- `onboarding`, `body-measurements`, `fitness-coach`: ADMIN solo targets de su gym; 404 cross-gym.
- `bookings` y `bookings/[id]`: cancelar solo `CONFIRMED`; `ATTENDED` → 409.
- `workout-logs`: split de asignación activa, ejercicios del split y nombre derivado del servidor.
- `exercises/[id]`: requiere auth y ya no expone planes/rutinas.
- `/routines/new` redirige a MEMBER; CTAs de trainer ocultos en detalle de ejercicio.
- Registro sin slug: solo resuelve automáticamente si hay **un** gym activo; con varios exige link.

### Membresía/pagos

- `/membresia`: navegación persistente, planes del gym y compra inicial con comprobante.
- Estado efectivo en dashboard, card, rutinas y plan.
- Autorenovación bloquea plan inactivo.
- Receipt valida método, gym, membresía vencida/confirmada y duplicado pendiente.
- Confirmar pago de membresía vencida devuelve 409.
- YAPE en formulario/card; historial muestra `notes`.

### Onboarding/rutinas

- Generador filtra el pool por ejercicios activos del gym.
- Onboarding sincroniza `updateSession` después del POST para evitar loop por JWT stale.
- Medición solo-perímetros habilitada.

### UX

- Solicitud PENDING ya no se muestra como coach asignado.
- Notificaciones: `TRAINER_REQUEST` abre el diálogo; `PAYMENT` va a `/membresia` (MEMBER).
- Botones +/- del workout con `aria-label`.

## Diferido

- Perfil completo (MBR-12).
- Check-in autoservicio (MBR-18).
- Historial real de entrenamientos (F-03).
- Fotos de progreso, edición/borrado de mediciones.
- Solicitud de coach iniciada por el miembro.
- `autoRenew` ejecutable (scheduler), waitlist, Stripe UI, preferencias de notificaciones, recuperación de contraseña.
- F-10 (`CardTitle` semántico) sigue diferido; no se mezcla con MBR-25.

## Validación

- `npm run db:reset`.
- `npm run validate`: **215 tests** passed (6 skipped).
- `npm run test:validation`: **65/65** E2E.
- Nota: el fixture E2E sigue usando un solo gym; las reglas cross-gym están cubiertas por validaciones de API y tests unitarios, no por E2E multi-sede.
