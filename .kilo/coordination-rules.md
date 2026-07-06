# Coordination Rules — GymApp Multi-Agent Testing

## Tab 1 (Coordinator) — único que escribe
Lee y escribe `.kilo/coordination-state.json`. Los demás tabs solo leen.

## Dependencias cross-user
| De | A | Acción | Bloquea a A hasta que... |
|----|---|--------|--------------------------|
| trainer | diego | trainer asigna plan a diego | diego puede hacer workout |
| trainer2 | valentina | trainer2 envía solicitud a valentina | valentina puede aceptar |
| trainer2 | roberto | trainer2 envía solicitud a roberto | roberto puede aceptar |
| valentina | trainer2 | valentina acepta solicitud | trainer2 ve cliente confirmado |
| roberto | trainer2 | roberto acepta solicitud | trainer2 ve cliente confirmado |

## Orden de ejecución por batch

### Batch 1
1. trainer → envía solicitud/asigna plan a diego (ya asignado en seed)
2. trainer2 → envía solicitud a valentina y roberto
3. superadmin/admin → verifican sistema
4. valentina → acepta solicitud de trainer2, elige plan

### Batch 2
1. carlos, ana, pedro → workout directo
2. mateo → workout (tiene plan pero 0 workouts)
3. diego → completa onboarding → workout (plan ya asignado)

### Batch 3
1. laura → onboarding → elegir plan → workout
2. sofia → renovar membresía → workout
3. ricardo → reactivar membresía → workout
4. roberto → aceptar trainer2 → elegir plan → workout

## DB Reset
Si un fixer modifica el schema de Prisma o el seed:
1. Se ejecuta `npm run db:reset`
2. Todos los usuarios afectados se REINICIAN desde su paso 1
3. Los flows pre-escritos se re-ejecutan sin re-razonar
