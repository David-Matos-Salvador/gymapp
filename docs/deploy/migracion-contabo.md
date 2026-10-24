# Migración de datos legacy → schema actual (Contabo)

Este documento describe el backfill de datos del schema legacy (`20260510025951_init`) al
schema actual, usando `scripts/migrate-legacy-contabo.ts`.

> **Alcance:** el script **no crea ni altera el schema**. Solo copia/mapea datos cuando el
> schema actual ya existe y las estructuras legacy siguen presentes. Tampoco borra tablas ni
> columnas legacy. El contrato (drop) es una fase posterior y separada.

**Artefactos de este runbook:**

- `prisma/migrations/20261024000001_expand_legacy/migration.sql` — DDL aditivo versionado.
- `scripts/restore-db.sh` — restore seguro a una base nueva.
- `scripts/verify-migration.sh` — verificación de schema, consistencia y conteos.
- [`docs/deploy/staging.md`](./staging.md) — runbook de staging aislado.

## Reglas no negociables

1. **Backup obligatorio y verificado** antes de cualquier cambio.
2. **No ejecutar `prisma db push`, `prisma migrate dev` ni `npm run db:reset`** contra Contabo.
3. **No aplicar `20261024000000_baseline` sobre una base legacy existente.** Es una baseline
   de schema completo; fallará con “relation already exists” o similar.
4. **No borrar** `Routine`, `RoutineExercise`, `WorkoutLog.routineId`, `Class.schedule` ni
   ningún dato legacy hasta completar la verificación y una fase de contrato posterior.
5. Todo se prueba primero en una **restauración staging** de Contabo.
6. El script corre en **dry-run por defecto**. `--apply` es explícito y transaccional.

## Qué se backfillea y qué no

| Área                                        | Acción                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Routine` / `RoutineExercise`               | Se crean `RoutinePlan` + un `RoutineSplit` “A” + `RoutineSplitExercise`. Se conserva `Routine.assignedToId` como `AssignedRoutinePlan`. |
| `WorkoutLog.routineId`                      | Se mapea a `splitId` usando el split determinístico de la rutina.                                                                       |
| `Class.schedule`                            | Se usa para completar `Class.startTime` (`HH:mm`). `dayOfWeek` no se reescribe.                                                         |
| `Class.gymId` nulo                          | Se infiere de `trainer.gymId`, del gym default o del único gym. Si hay ambigüedad, bloquea.                                             |
| `Gym.isDefault`                             | Se marca el único gym activo si no hay default. Varios activos sin default bloquean.                                                    |
| `Membership`                                | Se completan `planPrice`, `planCurrency`, `planDurationDays` desde el plan actual.                                                      |
| `Payment.membershipId`                      | Se vincula solo si hay una única membresía candidata por usuario/monto/moneda/fecha.                                                    |
| `Payment.confirmedAt`                       | Se completa con `updatedAt` en pagos `COMPLETED`. `confirmedById` queda `NULL`.                                                         |
| `GymExercise`                               | Se activan los ejercicios existentes para cada gym activo, solo pares faltantes.                                                        |
| `Exercise.userId/active`                    | Defaults del schema (`NULL` / `true`); no requiere backfill.                                                                            |
| `GymEquipment.machineNumber/isSystem`       | Defaults (`NULL` / `false`); el equipamiento legacy sigue asociado a su `gymId`.                                                        |
| `GymEquipmentActivation`                    | No se inventa: el legacy no tenía activaciones por gym para equipos de sistema. La UI trata la ausencia como activo.                    |
| `MembershipPlanPriceHistory`                | Queda vacío: el legacy no guardaba historial de precios.                                                                                |
| `MembershipPlan.price`                      | El `ALTER` a `DECIMAL(12,2)` preserva el valor; no hay recálculo.                                                                       |
| `Gym.ownerId`                               | Queda `NULL`: el legacy no registraba owner. Asignarlo es una decisión manual posterior.                                                |
| `User.stripeCustomerId`, `height`, `weight` | Quedan `NULL`; el legacy no los tenía.                                                                                                  |
| `TrainerRequest` / `TrainerInvite`          | Tablas nuevas vacías; no hay equivalente legacy.                                                                                        |

## 1. Backup

En el servidor o desde un host con acceso a Contabo:

```bash
export DATABASE_URL='postgresql://...'
npm run db:backup
# equivale a: bash scripts/backup-db.sh
```

El script:

- crea un dump custom en `./backups/contabo-<timestamp>.dump`,
- valida el archivo con `pg_restore --list`,
- imprime tamaño y SHA-256.

Guardá el `.dump` y el hash **fuera del servidor**. Sin backup verificado, no continuar.

## 2. Inventario read-only

Ejecutá estas consultas contra una copia o contra Contabo en modo lectura:

```sql
SELECT version();

SELECT migration_name, started_at, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Conteos mínimos:

```sql
SELECT 'Gym' AS table_name, count(*) FROM "Gym"
UNION ALL SELECT 'User', count(*) FROM "User"
UNION ALL SELECT 'Exercise', count(*) FROM "Exercise"
UNION ALL SELECT 'Routine', count(*) FROM "Routine"
UNION ALL SELECT 'RoutineExercise', count(*) FROM "RoutineExercise"
UNION ALL SELECT 'WorkoutLog', count(*) FROM "WorkoutLog"
UNION ALL SELECT 'Class', count(*) FROM "Class"
UNION ALL SELECT 'MembershipPlan', count(*) FROM "MembershipPlan"
UNION ALL SELECT 'Membership', count(*) FROM "Membership"
UNION ALL SELECT 'Payment', count(*) FROM "Payment";
```

También revisá el estado de Prisma (solo lectura):

```bash
npm run db:migrate:status
```

La historia de migraciones puede mostrar `20260510025951_init` aplicada y ausente del repo.
**No edites `_prisma_migrations` a mano** sin backup ni sin validar el comportamiento en
staging (ver sección 5).

Corré el dry-run del backfill:

```bash
export DATABASE_URL='postgresql://...'
npm run migrate:legacy:dry-run > /tmp/legacy-dry-run.json
cat /tmp/legacy-dry-run.json
```

El comando imprime un JSON con:

- `legacyDetected`: qué estructuras legacy encontró,
- `actions`: conteos planificados por sección,
- `duplicateChecks`: duplicados que romperían índices únicos actuales,
- `blockers`, `warnings`, `errors`.

**Si hay blockers, no ejecutes `--apply`.** Los más importantes:

- `duplicate:Membership.userId_planId`: el schema actual tiene una sola membresía por
  usuario+plan; el legacy permitía historial. Hay que decidir negocio (consolidar/renombrar
  planes o descartar filas) antes de migrar.
- `duplicate:Exercise.name`, `duplicate:MembershipPlan.gymId_name`,
  `duplicate:CheckIn.userId_date`, `duplicate:BodyMeasurement.userId_date`,
  `duplicate:Booking.userId_classId`, `duplicate:Routine.userId_name`.
- `ambiguous:gym-default`: hay varios gyms activos sin `isDefault`. Definí uno manualmente.
- `ambiguous:class-gym`: clases sin `gymId` y sin gimnasio inferible.
- `unresolved:class-startTime`: clases sin `startTime` ni `schedule` válido.
- `missing-column:*`: el schema actual no está aplicado todavía; no es un problema de datos.
- `conflict:routine-plan-name`: ya existe un `RoutinePlan` con el mismo `userId` + `name`.

## 3. Staging obligatorio

El runbook completo está en [`docs/deploy/staging.md`](./staging.md). Resumen:

1. Creá una base staging aislada y restaurá el backup con el script seguro (nunca
   `--clean` sobre una base existente):

   ```bash
   bash scripts/restore-db.sh \
     --dump backups/contabo-<timestamp>.dump \
     --admin-url 'postgresql://USER:PASSWORD@HOST:5432/postgres' \
     --target-db gymapp_staging_<tag>
   ```

2. Tomá un snapshot de conteos legacy:

   ```bash
   export DATABASE_URL='postgresql://.../gymapp_staging_<tag>'
   bash scripts/verify-migration.sh --write-baseline /tmp/legacy-baseline.txt
   ```

3. Aplicá el **DDL aditivo versionado**:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
     -f prisma/migrations/20261024000001_expand_legacy/migration.sql

   # o: npm run db:migrate:legacy:expand
   ```

   El DDL:
   - crea `RoutinePlan`, `RoutineSplit`, `RoutineSplitExercise`, `AssignedRoutinePlan`,
     `GymExercise`, `GymEquipmentActivation`, `MembershipPlanPriceHistory`, `TrainerRequest`
     y `TrainerInvite`;
   - agrega `WorkoutLog.splitId` **sin borrar** `routineId`;
   - agrega `Class.startTime` **sin borrar** `schedule`;
   - agrega `Gym.isDefault`, `Gym.ownerId`, `Gym.showMachineNumbers`, snapshots de
     `Membership`, `Payment.membershipId/confirmedAt/receiptUrl`, `Exercise.userId/active`,
     `GymEquipment.isSystem/machineNumber`, `Notification.metadata`, y las columnas nuevas
     restantes;
   - es **idempotente** y no borra columnas/tablas legacy;
   - **no crea** los índices únicos que pueden fallar por duplicados legacy. Quedan para la
     fase contract y `verify-migration.sh` los reporta.

4. Ejecutá el dry-run, revisá `blockers`, y luego el apply:

   ```bash
   npm run migrate:legacy:dry-run > /tmp/legacy-dry-run.json
   npm run migrate:legacy:apply > /tmp/legacy-apply.json
   ```

5. Verificá con el script (sección 6) y levantá la app contra staging.

6. Recién entonces repetí el mismo procedimiento en Contabo.

## 4. Flujo de apply en Contabo

1. Aviso y ventana de mantenimiento.
2. **Congelá escrituras**: bajá la app o poné la base en modo read-only para que no entren
   pagos, membresías, clases, logs ni rutinas durante el backfill.
3. Confirmá que el backup de la sección 1 está verificado y fuera del servidor.
4. Confirmá que el DDL aditivo ya se aplicó (o que el schema actual ya existe):

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
     -f prisma/migrations/20261024000001_expand_legacy/migration.sql
   ```

   Es idempotente; volver a aplicarlo no modifica datos ni estructuras existentes.

5. Dry-run final:

   ```bash
   export DATABASE_URL='postgresql://...'
   npm run migrate:legacy:dry-run > /tmp/legacy-dry-run-final.json
   ```

6. Apply:

   ```bash
   npm run migrate:legacy:apply > /tmp/legacy-apply.json
   ```

   El script:
   - ejecuta todo en una transacción;
   - si encuentra blockers antes de escribir, no escribe nada;
   - si falla a mitad, revierte la transacción;
   - no borra datos legacy;
   - es idempotente: una segunda ejecución debe reportar `planned: 0` y `applied: 0`.

7. Revisá que el exit code sea `0` y que el JSON tenga `"applied": true`,
   `blockers: []`, `errors: []`.
8. Repetí el apply una vez para confirmar idempotencia. Si vuelve a escribir filas, no
   continúes: revisá los warnings y el estado de la base.
9. Verificá con `bash scripts/verify-migration.sh --baseline /tmp/legacy-baseline.txt`
   (sección 6) y hacé smoke test de la app.
10. Recién después, levantá escrituras.

## 5. Baseline y `migrate resolve`

La baseline `20261024000000_baseline` **no es un upgrade**. Solo debe marcarse como aplicada
cuando la base ya tiene exactamente el schema actual.

### Caso A — base nueva

```bash
createdb gymapp_nueva
DATABASE_URL='postgresql://.../gymapp_nueva' npm run db:migrate:deploy
```

Luego se copian los datos con un ETL controlado. Este script asume que las estructuras legacy
existen; para una base nueva sin legacy no hay nada que backfillear.

### Caso B — base existente ya equivalente al schema actual

Solo después de comparar el schema (por ejemplo con `prisma migrate diff` contra una base
nueva migrada, o con una revisión manual columna por columna) y de validarlo en staging:

```bash
DATABASE_URL='postgresql://...' npx prisma migrate resolve --applied 20261024000000_baseline
```

`migrate resolve` **solo registra** la migración; no crea tablas ni columnas. Usarlo antes de
que el schema sea equivalente deja la base en un estado inconsistente.

### Caso C — base legacy que hay que transformar

Es el caso de Contabo. El camino correcto es:

1. backup,
2. restauración staging,
3. DDL aditivo revisado (sección 3),
4. backfill con este script,
5. verificación con `scripts/verify-migration.sh`,
6. recién ahí registrar la baseline **y el expand** con `migrate resolve --applied`
   (el DDL ya se aplicó a mano; `resolve` solo registra, no ejecuta),
7. validar `npm run db:migrate:status` en staging.

```bash
npx prisma migrate resolve --applied 20261024000000_baseline
npx prisma migrate resolve --applied 20261024000001_expand_legacy
```

> En la base legacy el schema todavía **no es exactamente** el baseline: conserva
> `Routine`, `Class.schedule`, `Class.startTime` nullable, etc. hasta la fase contract.
> Registrar el baseline es una decisión de bookkeeping para que `migrate deploy` no intente
> recrear tablas; no crea ni borra nada. Validalo en staging y no lo repitas a ciegas.

La fila de `20260510025951_init` puede quedar en `_prisma_migrations` aunque el archivo ya no
exista en el repo. Verificá en staging cómo la reporta Prisma 7. **No borres ni reescribas
filas de `_prisma_migrations`** para “limpiar” el estado sin backup y sin una decisión
explícita. Si Prisma bloquea el deploy por esa migración faltante, la alternativa segura es
una base nueva + ETL o un baseline acordado con el equipo; no un `db push`.

## 6. Verificación posterior

Comando principal (read-only, falla con exit code distinto de 0 si algo no cuadra):

```bash
bash scripts/verify-migration.sh --baseline /tmp/legacy-baseline.txt
# más estricto: --strict también falla por duplicados que bloquean el contract
```

Consultas manuales de respaldo:

```sql
-- Gimnasio default exactamente uno
SELECT count(*) FROM "Gym" WHERE "isDefault" = true;

-- Rutinas legacy vs nuevas
SELECT
  (SELECT count(*) FROM "Routine") AS legacy_routines,
  (SELECT count(*) FROM "RoutinePlan") AS plans,
  (SELECT count(*) FROM "RoutineSplit") AS splits,
  (SELECT count(*) FROM "RoutineSplitExercise") AS split_exercises;

-- Logs legacy mapeados (debe ser 0)
SELECT count(*) FROM "WorkoutLog"
WHERE "routineId" IS NOT NULL AND "splitId" IS NULL;

-- Clases sin gym o sin hora (debe ser 0)
SELECT count(*) FROM "Class" WHERE "gymId" IS NULL;
SELECT count(*) FROM "Class" WHERE "startTime" IS NULL OR btrim("startTime") = '';

-- Snapshots de membresía (debe ser 0)
SELECT count(*) FROM "Membership" WHERE "planPrice" IS NULL;

-- Pagos de membresía sin vínculo (revisar warnings del script)
SELECT count(*) FROM "Payment"
WHERE "membershipId" IS NULL AND "type" = 'MEMBERSHIP';

-- Pagos completados sin confirmedAt (debe ser 0)
SELECT count(*) FROM "Payment"
WHERE "status" = 'COMPLETED' AND "confirmedAt" IS NULL;

-- Activación de ejercicios por gym (debe ser 0)
SELECT count(*) FROM "Gym" g
CROSS JOIN "Exercise" e
LEFT JOIN "GymExercise" ge ON ge."gymId" = g."id" AND ge."exerciseId" = e."id"
WHERE g."active" = true AND ge."gymId" IS NULL;

-- Datos legacy intactos
SELECT count(*) FROM "Routine";
SELECT count(*) FROM "RoutineExercise";
SELECT count(*) FROM "WorkoutLog" WHERE "routineId" IS NOT NULL;
```

Smoke test mínimo en la app:

- login de admin/miembro,
- listado de rutinas y detalle de splits/ejercicios,
- historial de entrenamientos,
- clases y reservas,
- membresía actual y pagos,
- panel de gym default.

## 7. Rollback

- **Falla durante `--apply`:** la transacción revierte. La base queda como antes del intento.
  Corregí el blocker y repetí dry-run/apply.
- **Problema después del apply:** restaurá el backup en una **base nueva** y apuntá la app
  ahí. No uses `--clean` sobre la base productiva:

  ```bash
  bash scripts/restore-db.sh \
    --dump backups/contabo-<timestamp>.dump \
    --admin-url 'postgresql://USER:PASSWORD@HOST:5432/postgres' \
    --target-db gymapp_rollback_<timestamp>
  ```

  Luego redeployá la versión anterior de la app apuntando a la base restaurada.

- **Rollback selectivo:** las filas nuevas tienen IDs determinísticos
  (`legacy-routine-plan-*`, `legacy-routine-split-*`, `legacy-routine-exercise-*`,
  `legacy-routine-assignment-*`). Se pueden identificar, pero **no borrar en producción**
  sin revisar FKs y sin backup. Preferí restaurar el dump.

- **No hay `down`:** el upgrade es expand/contract. El rollback es restaurar el dump en una
  base nueva, no ejecutar SQL destructivo.

## 8. Fase de contrato (posterior)

Cuando la app lleve un período estable usando solo el schema nuevo:

1. backup nuevo y verificado,
2. `scripts/verify-migration.sh --strict` sin warnings de duplicados,
3. migración separada (contract) que:
   - elimine `Routine`, `RoutineExercise`, `WorkoutLog.routineId` y `Class.schedule`;
   - aplique `NOT NULL` a `Class.gymId` y `Class.startTime` (después del backfill);
   - cree los índices únicos postergados: `Exercise(name)`,
     `MembershipPlan(gymId, name)`, `Membership(userId, planId)`, `CheckIn(userId, date)`,
     `BodyMeasurement(userId, date)`, `Booking(userId, classId)`;
   - alinee las FKs `Membership_planId_fkey` (CASCADE → RESTRICT) y
     `Class_gymId_fkey` (SET NULL → RESTRICT);
4. verificación de que ninguna consulta de la app usa las columnas legacy,
5. deploy con backup y ventana de mantenimiento.

Este script y el DDL expand **no hacen ese drop**. Los duplicados que hoy se reportan como
`WARN` en `verify-migration.sh` bloquearán el contract hasta resolverse por negocio.

## 9. Riesgos y gaps conocidos

- **El DDL aditivo existe, pero no es automático.** La baseline no puede aplicarse sobre
  legacy; hay que ejecutar `20261024000001_expand_legacy/migration.sql` con `psql` antes del
  backfill. Sin él, el script reporta `missing-column:*`/`missing-current-schema:*`.
- **Diferencias deliberadas hasta el contract:** `Class.gymId` y `Class.startTime` siguen
  nullable; `Routine`, `RoutineExercise`, `Class.schedule` y `WorkoutLog.routineId` siguen
  existiendo; los índices únicos riesgosos y dos FKs (`Membership_planId_fkey`,
  `Class_gymId_fkey`) quedan como estaban. No son fallas del expand.
- **Dry-run de pagos:** antes del apply, `Membership.planCurrency` toma el default `PEN`, así
  que el dry-run puede reportar pagos `unmatched`. El apply actualiza el snapshot de
  membresía antes de vincular pagos; la verificación final es la fuente de verdad.
- **Rutina legacy → un solo split “A”.** El modelo legacy no distinguía días/splits. Si una
  rutina legacy representaba varios días, se pierde esa semántica; revisar nombres/descripciones.
- **`RoutinePlan` único por `userId` + `name`.** Nombres repetidos en el legacy bloquean el
  apply hasta resolverlos.
- **`Membership` único por `userId` + `planId`.** Historial de renovaciones legacy puede
  bloquear. Es el blocker más probable en datos reales.
- **Duplicados en índices únicos nuevos** (Exercise, MembershipPlan, CheckIn,
  BodyMeasurement, Booking) bloquean el apply; hay que deduplicar con criterio de negocio.
- **Monedas:** el legacy usaba `MXN`/`mxn` por defecto; el schema actual usa `PEN` y la
  validación de planes solo acepta `PEN`. El script **no convierte monedas**; solo reporta
  `non-pen` y monedas en minúsculas. Requiere decisión de negocio.
- **Snapshots de precio:** el legacy no guardaba precio histórico. Se copia el precio actual
  del plan (`MembershipPlan.price/currency/durationDays`), no el precio real al momento de la
  compra. `MembershipPlanPriceHistory` queda vacío: no se inventa historial que el legacy no
  registraba.
- **Activación de ejercicios:** se crean filas `GymExercise` activas solo para pares
  gym/ejercicio que no existan. Si un admin ya había desactivado un ejercicio, la fila existe
  y no se toca.
- **Pagos ambiguos:** si hay más de una membresía candidata por usuario/monto/moneda/fecha,
  el pago se omite y se reporta para revisión manual. No se adivina.
- **`Payment.confirmedAt`:** se completa con `updatedAt` para pagos `COMPLETED`; `confirmedById`
  queda `NULL` porque el legacy no registraba quién confirmó.
- **Gym default:** solo se elige automáticamente si hay un único gym activo (o un único gym).
  Varios activos sin default bloquean el apply.
- **Clases:** se toma la hora de `schedule` y se conserva `dayOfWeek`. Si no coinciden, se
  reporta warning; no se reescribe el día.
- **`WorkoutLog` sin `routineId`:** no se puede inferir el split; queda `splitId = NULL` y se
  reporta warning. La API nueva espera `splitId`, así que esos logs pueden no ser visibles.
- **Historia de migraciones:** la baseline reemplaza la init. El manejo de
  `_prisma_migrations` debe validarse en staging (sección 5).
- **No se probó contra Contabo.** Toda la validación fue local/aislada.
