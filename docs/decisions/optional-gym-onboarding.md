# Decisión: onboarding con gimnasio opcional y catálogo por defecto

## Contexto

Los miembros solo podían registrarse con el link de un gimnasio. El producto necesita cuentas globales que puedan usar rutinas/equipamiento sin pertenecer a un local, y vincularse a un gimnasio real durante el onboarding si corresponde.

## Decisión

- `User.gymId` sigue siendo nullable. Registro sin `gymSlug` crea `MEMBER` con `gymId=null`.
- El onboarding muestra el gate “¿Tenés un gimnasio?” antes del paso 1 si el usuario no tiene gym.
  - “Sí”: búsqueda por nombre/slug en gyms activos no-default y vinculación directa (`POST /api/user/gym`).
  - “No”: continúa con `gymId=null`; la decisión se recuerda en `sessionStorage` para no repetir el gate en la misma sesión.
- Existe un gym `isDefault=true` (`gymapp-default`), sin local, oculto de búsquedas e invitaciones.
- El default no se guarda en `User.gymId`; se resuelve como fallback de catálogo con `getEffectiveGym`.
- Equipamiento: activación del gym del usuario → activación del default → catálogo genérico.
- Ejercicios: `GymExercise.active` del gym del usuario; si no hay, default.
- El default no admite planes, membresías, clases ni invitaciones.

## Consecuencias

- Los usuarios sin gym pueden entrenar y ver equipamiento, pero no reservar clases ni comprar membresías.
- La vinculación se hace una vez; cambiar de gym queda fuera de alcance.
- `Gym.isDefault` requiere seed idempotente y filtros en listados.
- El gate usa datos de `/api/onboarding` (DB), no el JWT, para evitar loops por sesión stale.

## Validación

- `npm run db:reset` crea un único default con 45 ejercicios y 10 equipos activos.
- `npm run validate`: 215 tests.
- `npm run test:validation`: 65/65 E2E.
- Verificación manual: registro sin link → gate → “No tengo gimnasio” → paso 1; búsqueda “Fitness” → gym real; vinculación 200.
