#!/usr/bin/env bash
set -euo pipefail

# Read-only verification for the legacy -> current expand/backfill migration.
#
# Usage:
#   DATABASE_URL='postgresql://...' scripts/verify-migration.sh [options]
#
# Options:
#   --baseline FILE       Compare counts against a snapshot written before the
#                         migration with --write-baseline.
#   --write-baseline FILE Write legacy table counts to FILE and exit.
#   --strict              Treat warnings (e.g. deferred unique-index duplicates)
#                         as failures.
#   --help                Show this help.
#
# Exit code: 0 only when every FAIL check passes (and, with --strict, every WARN).

: "${DATABASE_URL:?DATABASE_URL no está definida}"

STRICT=0
BASELINE=""
WRITE_BASELINE=""

usage() {
  cat <<'EOF'
Read-only verification for the legacy -> current expand/backfill migration.

Usage:
  DATABASE_URL='postgresql://...' scripts/verify-migration.sh [options]

Options:
  --baseline FILE       Compare counts against a snapshot written before the
                        migration with --write-baseline.
  --write-baseline FILE Write legacy table counts to FILE and exit.
  --strict              Treat warnings (e.g. deferred unique-index duplicates)
                        as failures.
  --help                Show this help.

Exit code: 0 only when every FAIL check passes (and, with --strict, every WARN).
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --baseline)
      [[ $# -ge 2 ]] || die "--baseline requiere un archivo"
      BASELINE="$2"
      shift 2
      ;;
    --write-baseline)
      [[ $# -ge 2 ]] || die "--write-baseline requiere un archivo"
      WRITE_BASELINE="$2"
      shift 2
      ;;
    --strict)
      STRICT=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Argumento desconocido: $1 (usá --help)"
      ;;
  esac
done

[[ -z "$BASELINE" || -z "$WRITE_BASELINE" ]] \
  || die "Usá --baseline o --write-baseline, no ambos"

command -v psql >/dev/null 2>&1 || die "No se encontró psql en PATH"

LEGACY_TABLES=(
  Gym User Exercise Routine RoutineExercise WorkoutLog WorkoutSetLog
  Class Booking MembershipPlan Membership Payment Notification
  CheckIn BodyMeasurement ProgressPhoto GymEquipment Account Session
)
CURRENT_TABLES=(
  RoutinePlan RoutineSplit RoutineSplitExercise AssignedRoutinePlan
  GymExercise GymEquipmentActivation MembershipPlanPriceHistory
  TrainerRequest TrainerInvite
)

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS  %s\n' "$*"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf 'FAIL  %s\n' "$*" >&2
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  printf 'WARN  %s\n' "$*"
}

scalar() {
  psql -X -q -A -t -v ON_ERROR_STOP=1 "$DATABASE_URL" -c "$1" </dev/null
}

table_exists() {
  local name="$1"
  local value
  if ! value="$(scalar "SELECT to_regclass('public.\"$name\"') IS NOT NULL")"; then
    return 1
  fi
  [[ "$value" == "t" ]]
}

check_eq() {
  local name="$1"
  local sql="$2"
  local expected="$3"
  local value
  if ! value="$(scalar "$sql" 2>&1)"; then
    value="$(printf '%s' "$value" | tr '\n' ' ')"
    fail "$name (la consulta falló: $value)"
    return
  fi
  value="$(printf '%s' "$value" | tr '\n' ' ')"
  if [[ "$value" == "$expected" ]]; then
    pass "$name ($value)"
  else
    fail "$name: esperado '$expected', obtenido '$value'"
  fi
}

check_zero() {
  check_eq "$1" "$2" "0"
}

warn_zero() {
  local name="$1"
  local sql="$2"
  local value
  if ! value="$(scalar "$sql" 2>&1)"; then
    value="$(printf '%s' "$value" | tr '\n' ' ')"
    fail "$name (la consulta falló: $value)"
    return
  fi
  value="$(printf '%s' "$value" | tr '\n' ' ')"
  if [[ "$value" == "0" ]]; then
    pass "$name ($value)"
  else
    warn "$name: $value (revisar; el backfill puede haberlo omitido)"
  fi
}

duplicate_check() {
  local name="$1"
  local sql="$2"
  local value
  if ! value="$(scalar "$sql" 2>&1)"; then
    value="$(printf '%s' "$value" | tr '\n' ' ')"
    fail "duplicados $name (la consulta falló: $value)"
    return
  fi
  value="$(printf '%s' "$value" | tr '\n' ' ')"
  if [[ "$value" == "0" ]]; then
    pass "sin duplicados para $name"
  else
    warn "duplicados $name: $value grupos (bloquean el índice único de la fase contract)"
  fi
}

write_baseline_file() {
  local file="$1"
  local tmp
  local table
  local count
  tmp="$(mktemp "${TMPDIR:-/tmp}/gymapp-baseline.XXXXXX")"
  {
    printf '# gym-app legacy count snapshot %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    for table in "${LEGACY_TABLES[@]}"; do
      if table_exists "$table"; then
        count="$(scalar "SELECT count(*) FROM \"$table\"")"
        printf '%s|%s\n' "$table" "$count"
      fi
    done
  } >"$tmp"
  mv "$tmp" "$file"
  echo "Baseline escrito en $file"
}

if [[ -n "$WRITE_BASELINE" ]]; then
  write_baseline_file "$WRITE_BASELINE"
  exit 0
fi

echo "== Schema actual (expand) =="

MISSING_TABLES_SQL="
SELECT count(*)
FROM (VALUES
  ('MembershipPlanPriceHistory'),
  ('GymExercise'),
  ('GymEquipmentActivation'),
  ('RoutinePlan'),
  ('RoutineSplit'),
  ('RoutineSplitExercise'),
  ('AssignedRoutinePlan'),
  ('TrainerRequest'),
  ('TrainerInvite')
) AS required(name)
WHERE to_regclass(format('public.%I', required.name)) IS NULL"
check_zero "tablas nuevas existen" "$MISSING_TABLES_SQL"

MISSING_COLUMNS_SQL="
SELECT count(*)
FROM (VALUES
  ('Gym', 'isDefault'),
  ('Gym', 'showMachineNumbers'),
  ('Gym', 'ownerId'),
  ('User', 'stripeCustomerId'),
  ('User', 'height'),
  ('User', 'weight'),
  ('Membership', 'planPrice'),
  ('Membership', 'planCurrency'),
  ('Membership', 'planDurationDays'),
  ('GymEquipment', 'machineNumber'),
  ('GymEquipment', 'isSystem'),
  ('Exercise', 'userId'),
  ('Exercise', 'active'),
  ('WorkoutLog', 'splitId'),
  ('Class', 'startTime'),
  ('Class', 'active'),
  ('Payment', 'membershipId'),
  ('Payment', 'receiptUrl'),
  ('Payment', 'confirmedById'),
  ('Payment', 'confirmedAt'),
  ('Notification', 'metadata')
) AS required(tbl, col)
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = required.tbl
    AND c.column_name = required.col
)"
check_zero "columnas nuevas existen" "$MISSING_COLUMNS_SQL"

check_zero "tipos de dinero son DECIMAL(12,2)" "
SELECT count(*)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'MembershipPlan' AND column_name = 'price')
    OR (table_name = 'Payment' AND column_name = 'amount')
  )
  AND (data_type <> 'numeric' OR numeric_precision <> 12 OR numeric_scale <> 2)"

check_zero "enums nuevos existen" "
SELECT count(*)
FROM (VALUES ('TrainerRequestStatus'), ('InviteStatus')) AS required(name)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_type t
  WHERE t.typname = required.name
    AND t.typnamespace = 'public'::regnamespace
)"

check_zero "valores nuevos de enums existen" "
SELECT 2 - (
  SELECT count(*)
  FROM pg_enum e
  WHERE e.enumlabel IN ('YAPE', 'TRAINER_REQUEST')
    AND e.enumtypid IN (
      'public.\"PaymentMethod\"'::regtype,
      'public.\"NotificationType\"'::regtype
    )
)"

if table_exists "Routine"; then
  check_zero "columnas legacy preservadas (WorkoutLog.routineId, Class.schedule)" "
SELECT 2 - count(*)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'WorkoutLog' AND column_name = 'routineId')
    OR (table_name = 'Class' AND column_name = 'schedule')
  )"
fi

echo
echo "== Consistencia del backfill =="

HAS_GYM_DEFAULT="$(scalar "
SELECT count(*) FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Gym' AND column_name = 'isDefault'")"
if [[ "$HAS_GYM_DEFAULT" != "1" ]]; then
  fail "Gym.isDefault no existe; el DDL expand no está aplicado"
else
  GYM_COUNTS="$(scalar "SELECT concat(count(*) FILTER (WHERE \"isDefault\"), '|', count(*)) FROM \"Gym\"")"
  GYM_DEFAULTS="${GYM_COUNTS%%|*}"
  GYM_TOTAL="${GYM_COUNTS##*|}"
  if [[ "$GYM_TOTAL" == "0" ]]; then
    pass "Gym.isDefault (no hay gimnasios)"
  elif [[ "$GYM_DEFAULTS" == "1" ]]; then
    pass "Gym.isDefault (exactamente uno de $GYM_TOTAL)"
  else
    fail "Gym.isDefault: $GYM_DEFAULTS defaults sobre $GYM_TOTAL gimnasios (se espera exactamente 1)"
  fi
fi

if table_exists "Routine" && table_exists "RoutinePlan"; then
  check_zero "rutinas legacy tienen RoutinePlan" "
SELECT count(*)
FROM \"Routine\" r
WHERE NOT EXISTS (
  SELECT 1 FROM \"RoutinePlan\" p WHERE p.\"id\" = 'legacy-routine-plan-' || r.\"id\"
)"
fi

if table_exists "RoutineExercise" && table_exists "RoutineSplitExercise"; then
  check_zero "ejercicios de rutina legacy tienen RoutineSplitExercise" "
SELECT count(*)
FROM \"RoutineExercise\" re
WHERE NOT EXISTS (
  SELECT 1 FROM \"RoutineSplitExercise\" rse WHERE rse.\"id\" = 'legacy-routine-exercise-' || re.\"id\"
)"
fi

if table_exists "WorkoutLog" && table_exists "RoutineSplit"; then
  check_zero "WorkoutLog legacy mapeados a splitId" "
SELECT count(*) FROM \"WorkoutLog\"
WHERE \"routineId\" IS NOT NULL AND \"splitId\" IS NULL"
fi

check_zero "clases sin gymId" 'SELECT count(*) FROM "Class" WHERE "gymId" IS NULL'
check_zero "clases sin startTime" "
SELECT count(*) FROM \"Class\"
WHERE \"startTime\" IS NULL OR btrim(\"startTime\") = ''"

check_zero "membresías sin snapshot de precio" "
SELECT count(*) FROM \"Membership\" WHERE \"planPrice\" IS NULL"

check_zero "pagos COMPLETED sin confirmedAt" "
SELECT count(*) FROM \"Payment\"
WHERE \"status\" = 'COMPLETED' AND \"confirmedAt\" IS NULL"

warn_zero "pagos MEMBERSHIP sin membershipId" "
SELECT count(*) FROM \"Payment\"
WHERE \"type\" = 'MEMBERSHIP' AND \"membershipId\" IS NULL"

check_zero "ejercicios activos por gym (GymExercise)" "
SELECT count(*)
FROM \"Gym\" g
CROSS JOIN \"Exercise\" e
LEFT JOIN \"GymExercise\" ge
  ON ge.\"gymId\" = g.\"id\" AND ge.\"exerciseId\" = e.\"id\"
WHERE g.\"active\" = true AND ge.\"gymId\" IS NULL"

echo
echo "== Duplicados que bloquean índices únicos (fase contract) =="

duplicate_check "Exercise.name" '
SELECT count(*) FROM (
  SELECT "name" FROM "Exercise" GROUP BY "name" HAVING count(*) > 1
) d'

duplicate_check "MembershipPlan(gymId, name)" '
SELECT count(*) FROM (
  SELECT "gymId", "name" FROM "MembershipPlan" GROUP BY 1, 2 HAVING count(*) > 1
) d'

duplicate_check "Membership(userId, planId)" '
SELECT count(*) FROM (
  SELECT "userId", "planId" FROM "Membership" GROUP BY 1, 2 HAVING count(*) > 1
) d'

duplicate_check "CheckIn(userId, date)" '
SELECT count(*) FROM (
  SELECT "userId", "date" FROM "CheckIn" GROUP BY 1, 2 HAVING count(*) > 1
) d'

duplicate_check "BodyMeasurement(userId, date)" '
SELECT count(*) FROM (
  SELECT "userId", "date" FROM "BodyMeasurement" GROUP BY 1, 2 HAVING count(*) > 1
) d'

duplicate_check "Booking(userId, classId)" '
SELECT count(*) FROM (
  SELECT "userId", "classId" FROM "Booking" GROUP BY 1, 2 HAVING count(*) > 1
) d'

if table_exists "Routine"; then
  duplicate_check "Routine(userId, name)" '
SELECT count(*) FROM (
  SELECT "userId", "name" FROM "Routine" GROUP BY 1, 2 HAVING count(*) > 1
) d'
fi

if [[ -n "$BASELINE" ]]; then
  echo
  echo "== Comparación con baseline legacy =="
  [[ -f "$BASELINE" ]] || die "No existe el baseline: $BASELINE"
  while IFS='|' read -r table expected; do
    [[ -z "$table" || "$table" == \#* ]] && continue
    if [[ ! "$table" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      fail "baseline con nombre de tabla inválido: $table"
      continue
    fi
    if ! table_exists "$table"; then
      fail "tabla del baseline ya no existe: $table"
      continue
    fi
    ACTUAL="$(scalar "SELECT count(*) FROM \"$table\"")"
    if [[ "$ACTUAL" == "$expected" ]]; then
      pass "$table conserva $ACTUAL filas"
    else
      fail "$table: baseline $expected, actual $ACTUAL"
    fi
  done <"$BASELINE"
fi

echo
echo "== Conteos =="
for table in "${LEGACY_TABLES[@]}" "${CURRENT_TABLES[@]}"; do
  if table_exists "$table"; then
    printf '  %-34s %s\n' "$table" "$(scalar "SELECT count(*) FROM \"$table\"")"
  fi
done

echo
if [[ $FAIL_COUNT -gt 0 ]] || { [[ $STRICT -eq 1 ]] && [[ $WARN_COUNT -gt 0 ]]; }; then
  echo "RESULTADO: FAIL ($PASS_COUNT pass, $WARN_COUNT warn, $FAIL_COUNT fail)"
  exit 1
fi

echo "RESULTADO: PASS ($PASS_COUNT pass, $WARN_COUNT warn, 0 fail)"
