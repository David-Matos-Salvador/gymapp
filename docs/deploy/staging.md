# Staging aislado para la migración legacy

Runbook para probar el upgrade **expand + backfill** de una base legacy
(`20260510025951_init`) sin tocar Contabo ni la base de integración compartida.

> **Regla:** staging siempre es una base **nueva**, restaurada desde un dump. Nunca
> apuntes `DATABASE_URL` a Contabo, a `gymapp_fix_integration` ni a una base con datos
> reales para hacer pruebas destructivas.

## Artefactos

| Artefacto              | Ruta                                                           | Uso                                               |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| DDL aditivo versionado | `prisma/migrations/20261024000001_expand_legacy/migration.sql` | Lleva la legacy al schema actual sin borrar datos |
| Restore seguro         | `scripts/restore-db.sh`                                        | Restaura un dump en una base nueva y verifica     |
| Verificación           | `scripts/verify-migration.sh`                                  | Schema, consistencia, duplicados y conteos        |
| Backfill               | `scripts/migrate-legacy-contabo.ts`                            | Dry-run / apply de datos legacy                   |
| Backup                 | `scripts/backup-db.sh`                                         | Dump custom verificado con SHA-256                |

Requisitos en el host: `psql`, `pg_dump`, `pg_restore`, `createdb`, `dropdb` y Node 22+.

## 1. Backup verificado (origen)

En un host con acceso de lectura al origen:

```bash
export DATABASE_URL='postgresql://...'
npm run db:backup
```

Guardá el `.dump` y el hash **fuera del servidor**. No sigas sin backup verificado.

## 2. Crear staging desde el dump

```bash
export STAGING_TAG="$(date -u +%Y%m%dT%H%M%SZ)"
export STAGING_DB="gymapp_staging_${STAGING_TAG}"

bash scripts/restore-db.sh \
  --dump "backups/contabo-${STAGING_TAG}.dump" \
  --admin-url 'postgresql://USER:PASSWORD@HOST:5432/postgres' \
  --target-db "$STAGING_DB"

export STAGING_URL="postgresql://USER:PASSWORD@HOST:5432/${STAGING_DB}"
```

`restore-db.sh`:

- rechaza la operación si la base destino ya existe (no sobrescribe),
- crea una base vacía y restaura con `--no-owner --no-privileges --single-transaction`,
- valida el dump con `pg_restore --list`,
- verifica que existan las tablas núcleo (`Gym`, `User`, `Payment`) y reporta conteos,
- si falla, elimina la base nueva (salvo `KEEP_ON_FAILURE=1`).

## 3. Snapshot previo de conteos

Con `DATABASE_URL` apuntando a staging:

```bash
export DATABASE_URL="$STAGING_URL"
bash scripts/verify-migration.sh --write-baseline /tmp/legacy-baseline.txt
```

El snapshot guarda los conteos de las tablas legacy. La verificación final compara contra
ese archivo para detectar pérdida de filas.

## 4. Aplicar el DDL aditivo

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f prisma/migrations/20261024000001_expand_legacy/migration.sql

# equivalente:
# npm run db:migrate:legacy:expand
```

El DDL es idempotente (`IF NOT EXISTS`, guards en `DO $$`). Se puede aplicar dos veces sin
efectos adicionales. **No crea** los índices únicos que los duplicados legacy pueden
romper; esos quedan para la fase contract.

## 5. Backfill

```bash
npm run migrate:legacy:dry-run > /tmp/legacy-dry-run.json
cat /tmp/legacy-dry-run.json
```

Revisá:

- `blockers` debe estar vacío,
- `legacyDetected` debe reconocer `Routine`, `RoutineExercise`, `WorkoutLog.routineId`,
  `Class.schedule`, `Gym.isDefault`, snapshots y `Payment.membershipId`,
- `warnings` esperados: monedas no-PEN, moneda en minúsculas, `dayOfWeek` distinto de
  `schedule`, y pagos que el dry-run todavía no puede vincular.

En dry-run, `Payment.membershipId` puede reportar `unmatched` porque el snapshot de
`Membership.planCurrency` todavía no se aplicó. El `--apply` actualiza membresías antes de
vincular pagos; verificá el resultado final con `verify-migration.sh`.

Si no hay blockers:

```bash
npm run migrate:legacy:apply > /tmp/legacy-apply.json
```

El apply es transaccional e idempotente. Corré una segunda vez para confirmar que no vuelve
a escribir (`planned: 0`, `applied: 0`).

## 6. Verificación

```bash
bash scripts/verify-migration.sh --baseline /tmp/legacy-baseline.txt
```

El script es read-only y falla con exit code distinto de 0 si:

- falta una tabla/columna del schema actual,
- `price`/`amount` no son `DECIMAL(12,2)`,
- falta un valor de enum (`YAPE`, `TRAINER_REQUEST`) o un tipo nuevo,
- no hay exactamente un `Gym.isDefault`,
- una rutina/ejercicio/log/clase/membresía/pago quedó sin backfillear,
- cambió el conteo de una tabla legacy respecto del baseline.

Para exigir también los warnings (duplicados que bloquean la fase contract):

```bash
bash scripts/verify-migration.sh --baseline /tmp/legacy-baseline.txt --strict
```

## 7. Smoke test

Con la app apuntando a staging:

- login admin / trainer / member,
- listado y detalle de rutinas, splits y ejercicios,
- historial de entrenamientos,
- clases y reservas,
- membresía actual, snapshots y pagos,
- gimnasio default y ejercicios activos por gym.

## 8. Historia de Prisma

La base legacy conserva `20260510025951_init` en `_prisma_migrations`, pero ese archivo ya no
está en el repo. Después de validar el schema y el backfill en staging:

```bash
npx prisma migrate status
```

Si Prisma queda bloqueado por la migración faltante, **no borres ni edites filas de
`_prisma_migrations`**. Las opciones seguras son:

1. registrar el baseline y el expand como aplicados con `prisma migrate resolve --applied`
   en staging, entendiendo que el DDL ya se aplicó a mano, o
2. una base nueva + ETL controlado.

`migrate resolve` no ejecuta DDL: solo registra la migración. Validá siempre en staging antes
de repetirlo.

## 9. Rollback

El upgrade no tiene un `down` destructivo. Para volver atrás:

1. restaura el dump en **otra base nueva**:

   ```bash
   bash scripts/restore-db.sh \
     --dump "backups/contabo-${STAGING_TAG}.dump" \
     --admin-url 'postgresql://USER:PASSWORD@HOST:5432/postgres' \
     --target-db "gymapp_rollback_${STAGING_TAG}"
   ```

2. apuntá la app a esa base,
3. redeployá la versión anterior de la app.

No ejecutes `DROP TABLE`, `DELETE`, `TRUNCATE` ni un `down` generado por Prisma sobre una
base con datos reales. Si el `--apply` falla, la transacción revierte y no hace falta
restaurar.

## 10. Limpieza de staging

```bash
dropdb --maintenance-db='postgresql://USER:PASSWORD@HOST:5432/postgres' "$STAGING_DB"
```

Nunca ejecutes esta limpieza contra Contabo ni contra una base compartida.

## 11. Pipeline CI y equivalentes locales

GitHub Actions (`.github/workflows/ci.yml`) valida migraciones y app en **dos jobs** sobre
una base nueva. No reemplaza este runbook: el upgrade de un dump legacy (expand + backfill)
se sigue validando en staging con los pasos 1–10.

| Job       | Pasos                                                                                  |
| --------- | -------------------------------------------------------------------------------------- |
| `quality` | `npm ci`, `prisma generate`, `format:check`, `lint`, `typecheck`, unitarios y `build`  |
| `e2e`     | Postgres 16 + Redis 7, `migrate deploy`, `migrate status`, drift check, seed demo, E2E |

El job `e2e` corre `npm run test:validation` con `VALIDATION_SKIP_RESET=1` porque la base ya
fue migrada y sembrada en pasos previos. No tiene `continue-on-error`; si falla, el pipeline
falla. Los reportes y screenshots quedan como artefacto.

Comandos locales equivalentes (base aislada, nunca Contabo):

```bash
export DATABASE_URL='postgresql://gymuser:gympassword@localhost:5432/gymapp_ci?schema=public'
export REDIS_URL='redis://localhost:6379'
export AUTH_SECRET='ci-only-auth-secret-0123456789abcdef0123456789abcdef'
export AUTH_URL='http://localhost:3000'
export NEXT_PUBLIC_APP_URL='http://localhost:3000'

npm ci
npx prisma generate
npm run db:migrate:deploy
npm run db:migrate:status
npx prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code
npm run db:seed
npx playwright install --with-deps chromium
VALIDATION_SKIP_RESET=1 npm run test:validation
```

Notas:

- `db:seed` es el seed **demo** y solo corresponde a CI/desarrollo. Staging con dump legacy
  no debe sembrarse con datos ficticios; usá el backfill y `verify-migration.sh`.
- El drift check compara `prisma/schema.prisma` contra la base migrada. En CI la base nace
  vacía, así que debe salir sin diferencias. En una base legacy el DDL expand deja tablas y
  columnas legacy a propósito, por lo que el diff puede mostrar diferencias esperadas.
- `migrate status` detecta migraciones pendientes o fallidas; no reemplaza al drift check.
