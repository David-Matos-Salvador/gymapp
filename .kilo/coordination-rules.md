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

## Bug Severity — Fixer Rules

### Política: CERO bugs sin fixer
**Ningún bug se deja pasar.** Da igual si es crítico, medio o menor. Cada bug detectado genera un fixer.

| Severidad | Acción | ¿Bloquea al usuario? |
|-----------|--------|----------------------|
| critical | Fixer inmediato, worktree aislado | Sí, pausa el flow |
| medium | Fixer en paralelo (si no bloquea) o inmediato | Solo si es bloqueante |
| low/minor | Fixer agendado para después del batch | No, el usuario sigue |

### Flujo del fixer
1. Agente reporta bug → `coordination-state.json → bugs_found`
2. Coordinator/Optimizer evalúa severidad
3. Se crea fixer (tab Agent Manager + worktree) con template `user-agent-template.md`
4. Fixer usa **OpenSpec** (`/openspec-propose` → `/openspec-apply-change`) para resolver
5. Fixer commitea → mergea a main
6. Si el fix toca DB: `npm run db:reset` → reiniciar usuarios afectados
7. Si no toca DB: solo reiniciar el paso afectado del usuario

### Batch 1 (actual) — transición
Los bugs menores detectados se documentan pero NO se fixean durante batch 1.

### Batch 2 y 3 — tolerancia cero
Todo bug detectado → fixer automático. No se avanza al siguiente batch hasta que todos los bugs del batch actual estén resueltos.

## DB Reset
Si un fixer modifica el schema de Prisma o el seed:
1. Se ejecuta `npm run db:reset`
2. Todos los usuarios afectados se REINICIAN desde su paso 1
3. Los flows pre-escritos se re-ejecutan sin re-razonar
