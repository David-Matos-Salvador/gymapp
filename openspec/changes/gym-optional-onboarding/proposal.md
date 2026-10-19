## Why

Hoy un miembro solo puede registrarse con el link de un gimnasio. Eso bloquea a usuarios que quieren usar la app sin pertenecer a un local y obliga a crear cuentas “a mano”. El producto necesita cuentas globales que, durante el onboarding, declaren si están relacionados con un gimnasio; si no, deben seguir operando con un catálogo por defecto.

## What Changes

- **BREAKING** El registro público ya no exige `gymSlug`. Se crea `MEMBER` con `gymId = null` salvo que venga un link/invitación de gimnasio.
- El onboarding agrega la pregunta “¿Tenés un gimnasio?” con búsqueda por nombre/slug. El miembro puede solicitar unirse a un gym y ver su catálogo mientras espera; la pertenencia la aprueba el dueño/ADMIN del gym.
- Si el miembro no tiene gimnasio, se resuelve un **gym por defecto** (`isDefault = true`) como fallback de catálogo; no se guarda en `User.gymId`.
- El gimnasio por defecto no tiene local, no aparece en búsquedas públicas/invitaciones y no ofrece membresías, planes ni clases.
- Equipamiento y números de máquina: se usa la configuración del gym del usuario; si no tiene gym o no hay activación, se usa la del gym por defecto; si tampoco existe, el catálogo genérico.
- Un link/invitación de gimnasio preselecciona el gym y evita la pregunta de onboarding.
- El miembro puede solicitar cambiar de gimnasio; la aprobación la hace el gym destino.
- Un miembro sin gym puede tener coach global; un miembro con gym solo coaches de su gym.

## Capabilities

### New Capabilities

- `member-gym-affiliation`: registro sin gym, pregunta y búsqueda en onboarding, solicitud/aprobación de pertenencia, cambio de gym, gym por defecto y reglas de visibilidad.
- `default-gym-catalog`: fallback de equipamiento/máquinas al gym por defecto solo para miembros sin gym y exclusión de membresías/clases del default.
- `global-coach-matching`: un miembro sin gym puede solicitar/aceptar coaches; al tener gym, el vínculo se limita a ese gym.

### Modified Capabilities

<!-- No existen specs previas en openspec/specs/. -->

## Impact

- Prisma: `Gym.isDefault`; seed idempotente del gym por defecto.
- `src/app/api/auth/register`, onboarding UI/API y búsqueda de gimnasios.
- `src/lib/gym-equipment`, `src/app/equipamiento`, endpoints de equipamiento/rutinas.
- Tests de registro, onboarding, equipamiento y E2E; actualización de `VALIDATION_REPORT.md`.

## Non-goals

- Creación de gimnasios por dueños existentes o multi-sede.
- Cambio del flujo trainer solicita / miembro acepta.
- Membresías, planes o clases dentro del gym por defecto.
- Cambio de gimnasio desde el perfil después del onboarding.
