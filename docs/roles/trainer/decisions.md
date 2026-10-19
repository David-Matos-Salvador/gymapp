# Decisiones TRAINER — `fix/validation-batch-1`

Base: `docs/roles/trainer/audit.md` + veredicto del juez adversarial.
Estado: P0/P1/P2 implementados y validados. Diferidos al backlog.

## Veredicto

| ID     | Veredicto                         | Estado                                                            |
| ------ | --------------------------------- | ----------------------------------------------------------------- |
| TRN-01 | CONFIRMED Alta                    | Implementado                                                      |
| TRN-02 | CONFIRMED Alta (alcance reducido) | Implementado                                                      |
| TRN-03 | CONFIRMED Alta                    | Implementado                                                      |
| TRN-04 | CONFIRMED Media                   | Implementado                                                      |
| TRN-05 | CONFIRMED Media                   | Implementado                                                      |
| TRN-06 | CONFIRMED Media                   | Implementado                                                      |
| TRN-07 | CONFIRMED Media (feature)         | Implementado                                                      |
| TRN-08 | CONFIRMED Media                   | Implementado                                                      |
| TRN-09 | DEFERRED                          | Backlog producto                                                  |
| TRN-10 | CONFIRMED Media                   | Implementado                                                      |
| TRN-11 | DEFERRED                          | Backlog UX (búsqueda por nombre ya soportada de forma incidental) |
| TRN-12 | CONFIRMED Media                   | Implementado                                                      |
| TRN-13 | CONFIRMED Media (feature)         | Implementado                                                      |
| TRN-14 | DEFERRED                          | Backlog UX                                                        |
| TRN-15 | CONFIRMED Media                   | Implementado                                                      |
| TRN-16 | CONFIRMED Media                   | Implementado (contexto + motivo); historial completo diferido     |
| TRN-17 | CONFIRMED Baja                    | Implementado por política 4                                       |
| TRN-18 | DEFERRED                          | Backlog a11y (falso positivo del input descartado)                |
| TRN-19 | CONFIRMED Baja                    | Implementado                                                      |
| TRN-20 | DEFERRED                          | Backlog UX (empty state implementado igualmente)                  |

## Políticas

1. **Cliente = `assignedTrainerId`.** `TrainerRequest` es intención/historial. Aceptar una solicitud asigna atómicamente el trainer, valida mismo gym y rechaza si ya hay otro trainer. Confirmar un pago ya no asigna trainer.
2. **Mismo gym obligatorio.** Búsqueda, solicitud, aceptación, ficha, pagos, rutinas, clases, reservas e invitaciones validan `gymId`. `SUPER_ADMIN` requiere gym explícito en búsqueda/reserva.
3. **Clases del TRAINER.** Crea solo en su gym con `trainerId = self`; edita/cancela solo las propias; ADMIN gestiona su gym; SUPER global. Cancelar desactiva la clase (`Class.active = false`), cancela reservas y notifica; no se borra el historial.
4. **Alta directa de miembros.** TRAINER no crea miembros con contraseña; solo invitaciones. ADMIN crea miembros en su gym. `/api/trainer/members` queda restringido a ADMIN.
5. **Staff en clases.** Staff reserva como participante en su gym y con membresía `ACTIVE + endDate + paymentConfirmed`. No puede reservar una clase que dicta.
6. **Pagos.** La ruta canónica es `receipt` con `membershipId`. El shim legacy `/api/payments` crea/reutiliza una membresía sin confirmar exactamente una vez, setea `membershipId`, rechaza comprobantes pendientes duplicados y notifica al trainer asignado. Confirmar pago no asigna trainer.
7. **Personalización idempotente.** Una copia editable activa por cliente; el segundo “Personalizar” reutiliza la asignación existente. Nombres determinísticos con sufijo si hay colisión.
8. **Historial de pagos.** Bandeja `PENDING` de clientes asignados; historial completo queda como feature. El rechazo exige motivo editable.
9. **Biblioteca de rutinas.** TRAINER ve propias + plantillas SUPER; no rutinas de otros trainers. ADMIN lee/duplica las de su gym pero no edita/borra. La visibilidad ADMIN de rutinas de trainers queda como deuda ADMIN.

## Implementación

### Aislamiento y vínculo

- `lib/trainer-client.ts`: cliente = asignado; `hasAnyTrainer` = asignado.
- `api/members/search`: mismo gym, búsqueda por nombre/email, SUPER con `gymId`.
- `api/trainer/clients`: mismo gym, reenvío de rechazada reactiva, 409 accionable.
- `api/user/trainer-requests/[id]`: aceptación transaccional con `assignedTrainerId`, mismo gym, concurrencia segura.
- `api/payments/[id]` y `pending`: solo clientes asignados del mismo gym; confirmar no asigna.
- `api/trainer/clients/[id]`: ficha/desasignación con gym; notificación al desasignar.

### Rutinas

- `lib/routine-access.ts`: lectura owner/SUPER/ADMIN del gym/miembro asignado; sin visibilidad trainer→trainer.
- `api/routines/[id]`, `api/routine-splits/[id]` y `/routines/[id]`: mismo criterio; acciones solo owner/SUPER.
- `api/routines` y `api/split-exercises`: Zod con rangos, 409 por nombre duplicado, ejercicios solo si `GymExercise.active` del gym.
- `GET /api/exercises`: filtra por gym del usuario autenticado; sin sesión mantiene catálogo global.
- `api/routines/duplicate`: reutiliza copia activa, nombres únicos y asignación transaccional.

### Membresía y pagos

- Coach dashboard/lista/ficha usan `ACTIVE + endDate + paymentConfirmed`.
- Legacy `/api/payments` liga cada Payment a `membershipId` y evita duplicados pendientes.
- Receipt notifica al trainer asignado.

### Clases

- `Class.active` + migración por `db push`.
- `api/classes`: lista solo activas.
- `api/classes/[id]`: GET roster, PATCH datos, DELETE lógico con cancelación de reservas y notificaciones.
- `api/bookings`: valida gym, clase activa, no dictar y reservar, membresía confirmada para todo rol.
- `api/bookings/[id]`: lectura por owner/staff/admin; asistencia solo trainer de la clase/admin.
- `/coach/classes/[id]`: edición, roster, asistencia y cancelación.
- `/classes`: link “Gestionar clase” para el trainer propio y empty state.

## Diferido

- Perfil profesional del coach (TRN-09).
- Historial/ledger completo de pagos y exportación.
- Revocación/gestión avanzada de invitaciones y expiración derivada en UI (TRN-14).
- A11y de botones icon-only y modales (TRN-18).
- Biblioteca de plantillas del gym.
- Visibilidad ADMIN de rutinas de trainers de su gym (deuda ADMIN).
- Mensajería trainer-cliente, paginación/filtros server-side.

## Validación

- `npm run db:reset` con `Class.active`.
- `npm run validate`: **215 tests** passed (6 skipped).
- `npm run test:validation`: **65/65** E2E.
- Casos E2E actualizados: coach invita (no crea contraseñas), invitación sin toggle, rechazo de pago con motivo.
