## Context

Ver `proposal.md` y las specs `member-gym-affiliation` y `default-gym-catalog`. El modelo ya tiene `User.gymId` nullable y `Gym` con `active`, `ownerId` y `showMachineNumbers`. Hoy el registro y el onboarding asumen un gym obligatorio, y el equipamiento se resuelve solo contra `user.gymId`.

## Goals / Non-Goals

**Goals:**
- Permitir cuentas sin gimnasio y vinculación explícita durante onboarding.
- Resolver equipamiento/ejercicios con fallback a un gym por defecto.
- Mantener membresías, planes, clases e invitaciones fuera del gym por defecto.

**Non-Goals:**
- Multi-sede o creación de gyms por dueños.
- Cambio de gym posterior al onboarding.
- Membresías o clases en el gym por defecto.

## Decisions

### 1. `Gym.isDefault` como marca del catálogo global
Se agrega `isDefault Boolean @default(false)`. El seed hace upsert de un único gym `isDefault=true`, `active=true`, `address=null`, slug reservado (`gymapp-default`). La unicidad se valida en seed y en escritura; no se usa una unique parcial porque Prisma/`db push` no la soporta de forma portable.

Alternativa descartada: inferir el default por slug o por ser el primer gym. Es frágil y permite que un admin lo renombre.

### 2. `User.gymId = null` significa “sin gimnasio”
No se guarda el default en `User.gymId`. Un resolver `getEffectiveGymId(user)` devuelve `user.gymId` o el id del default. Esto preserva la semántica “no pertenece a un gym” y evita que el usuario aparezca en listados del gym por defecto.

Consecuencia: todo endpoint que necesite catálogo debe usar el resolver; los endpoints de operación (membresías, clases, reservas, invitaciones) siguen exigiendo `user.gymId` real.

### 3. Registro sin gym, link opcional
`POST /api/auth/register` acepta `gymSlug` opcional. Sin slug crea `gymId=null`; con slug válido asigna. Se elimina el fallback al primer gym. La invitación sigue creando el miembro con el gym de la invitación.

### 4. Pregunta de onboarding como gate inicial
Si el miembro no es asistido, no tiene gym y no viene de invitación, el onboarding muestra un gate “¿Tenés un gimnasio?” antes del paso 1:
- “Sí” abre búsqueda por nombre/slug contra gyms activos no-default.
- Al seleccionar, `POST /api/user/gym` vincula y continúa.
- “No” continúa con `gymId=null`.
El gate no se repite en la misma sesión de onboarding. Si el miembro ya tiene gym (invitación), se omite.

Alternativa descartada: insertar un paso numerado y desplazar los 10 pasos existentes; mayor riesgo de romper la máquina de estados y el progreso.

### 5. Búsqueda y vinculación
`GET /api/gyms/search?q=` autenticado, devuelve hasta 10 gyms activos, `isDefault=false`, por nombre/slug. `POST /api/user/gym` valida gym activo/no-default y setea `gymId` solo si el usuario aún no tiene uno (o es el mismo); devuelve 409 si ya pertenece a otro.

### 6. Fallback de equipamiento por ítem
Para cada equipo:
1. Activación del gym del usuario (`GymEquipmentActivation`).
2. Si no existe, activación del gym por defecto.
3. Si no existe, catálogo genérico.
Los números de máquina se muestran si el gym efectivo que aportó la configuración tiene `showMachineNumbers=true`.
Para ejercicios: `GymExercise` del gym del usuario; si no hay filas o no está activo, `GymExercise` del default.

### 7. Default sin operación
El seed no crea planes, clases, membresías ni invitaciones para el default. Los endpoints de creación validan `gym.isDefault=false`. La UI de membresía/clases muestra un CTA para vincular un gym cuando `gymId=null`.

## Risks / Trade-offs

- **Usuarios existentes con `gymId=null`**: pueden quedar sin catálogo hasta que el resolver esté aplicado en todos los endpoints → auditar rutas de equipamiento/ejercicios y cubrir con tests.
- **Fallback por ítem puede mezclar gyms**: un equipo del gym real y otro del default en la misma rutina → aceptado por requisito; documentar en UI que el default es catálogo de respaldo.
- **Gate de onboarding y JWT**: el onboarding ya sufrió loops por sesión stale → el gate usa datos de DB/API, no `session.user.gymId`.
- **Gym default visible en admin**: filtrar `isDefault=false` en listados de selección, invitaciones y planes.
- **Datos de seed**: el default debe ser idempotente y no duplicarse al re-ejecutar `db:reset`.

## Migration Plan

1. Agregar `Gym.isDefault` y ejecutar `prisma db push` (flujo del repo, sin migraciones).
2. Seed upsert del gym default + activaciones de ejercicios/equipos.
3. Desplegar endpoints/resolver y luego UI.
4. Rollback: los usuarios con `gymId=null` siguen siendo válidos; el flag `isDefault` puede quedar sin uso sin romper datos.

## Open Questions

Ninguna bloqueante. El cambio de gym posterior al onboarding queda fuera de alcance.
