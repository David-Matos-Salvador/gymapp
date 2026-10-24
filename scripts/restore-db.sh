#!/usr/bin/env bash
set -euo pipefail

# Restore a custom-format PostgreSQL dump into a NEW, isolated database.
#
# This is the safe restore path for staging and rollback. It never uses
# --clean/--if-exists, never touches an existing database, and verifies the
# result before returning success.
#
# Usage:
#   scripts/restore-db.sh --dump FILE --admin-url URL --target-db NAME
#
# Example:
#   scripts/restore-db.sh \
#     --dump backups/contabo-20261024T120000Z.dump \
#     --admin-url 'postgresql://gymuser:secret@localhost:5432/postgres' \
#     --target-db gymapp_staging_20261024
#
# Env:
#   KEEP_ON_FAILURE=1   Do not drop the new database if the restore fails.

usage() {
  cat <<'EOF'
Restore a custom-format PostgreSQL dump into a NEW, isolated database.

This is the safe restore path for staging and rollback. It never uses
--clean/--if-exists, never touches an existing database, and verifies the
result before returning success.

Usage:
  scripts/restore-db.sh --dump FILE --admin-url URL --target-db NAME

Example:
  scripts/restore-db.sh \
    --dump backups/contabo-20261024T120000Z.dump \
    --admin-url 'postgresql://gymuser:secret@localhost:5432/postgres' \
    --target-db gymapp_staging_20261024

Env:
  KEEP_ON_FAILURE=1   Do not drop the new database if the restore fails.
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

DUMP=""
ADMIN_URL=""
TARGET_DB=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump)
      [[ $# -ge 2 ]] || die "--dump requiere un valor"
      DUMP="$2"
      shift 2
      ;;
    --admin-url)
      [[ $# -ge 2 ]] || die "--admin-url requiere un valor"
      ADMIN_URL="$2"
      shift 2
      ;;
    --target-db)
      [[ $# -ge 2 ]] || die "--target-db requiere un valor"
      TARGET_DB="$2"
      shift 2
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

[[ -n "$DUMP" ]] || die "Falta --dump"
[[ -n "$ADMIN_URL" ]] || die "Falta --admin-url"
[[ -n "$TARGET_DB" ]] || die "Falta --target-db"

for cmd in psql createdb dropdb pg_restore; do
  command -v "$cmd" >/dev/null 2>&1 || die "No se encontró $cmd en PATH"
done

[[ -f "$DUMP" ]] || die "No existe el dump: $DUMP"
[[ -s "$DUMP" ]] || die "El dump está vacío: $DUMP"

[[ "$TARGET_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] \
  || die "Nombre de base inválido: $TARGET_DB (solo letras, números y _)"

case "$TARGET_DB" in
  postgres|template0|template1)
    die "No se puede restaurar sobre la base de sistema: $TARGET_DB"
    ;;
esac

[[ "$ADMIN_URL" == *"://"* ]] || die "--admin-url no parece una URL de PostgreSQL"

# A dbname/database query parameter would silently redirect the target URL.
if [[ "$ADMIN_URL" =~ [\?\&](dbname|database)= ]]; then
  die "--admin-url no debe incluir dbname=/database= en la query"
fi

BASE="${ADMIN_URL%%\?*}"
QUERY=""
if [[ "$ADMIN_URL" == *"?"* ]]; then
  QUERY="?${ADMIN_URL#*\?}"
fi
[[ "$BASE" == */* ]] || die "--admin-url debe terminar en /<base> (por ejemplo /postgres)"
BASE_NO_DB="${BASE%/*}"
TARGET_URL="${BASE_NO_DB}/${TARGET_DB}${QUERY}"

pg_restore --list "$DUMP" >/dev/null 2>&1 \
  || die "El dump no es legible por pg_restore --list: $DUMP"

echo "Verificando que la base destino no exista..."
EXISTS="$(psql "$ADMIN_URL" -X -q -A -t -v ON_ERROR_STOP=1 \
  -c "SELECT 1 FROM pg_database WHERE datname = '$TARGET_DB'")" \
  || die "No se pudo conectar a --admin-url"

if [[ "$EXISTS" == "1" ]]; then
  die "La base destino '$TARGET_DB' ya existe. Elegí otro nombre; no se sobrescribe."
fi

CREATED=0
cleanup() {
  local status=$?
  if [[ $status -ne 0 && $CREATED -eq 1 && "${KEEP_ON_FAILURE:-0}" != "1" ]]; then
    echo "Restore fallido: eliminando la base nueva '$TARGET_DB'." >&2
    dropdb --maintenance-db="$ADMIN_URL" --if-exists "$TARGET_DB" >/dev/null 2>&1 || true
    echo "Usá KEEP_ON_FAILURE=1 para conservarla y revisarla." >&2
  fi
  exit "$status"
}
trap cleanup EXIT

echo "Creando base destino '$TARGET_DB'..."
createdb --maintenance-db="$ADMIN_URL" "$TARGET_DB"
CREATED=1

echo "Restaurando $DUMP (sin owner/privileges, transacción única)..."
pg_restore \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  --dbname="$TARGET_URL" \
  "$DUMP"

echo "Verificando restauración..."
TABLE_COUNT="$(psql "$TARGET_URL" -X -q -A -t -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")"

[[ "$TABLE_COUNT" =~ ^[0-9]+$ ]] || die "No se pudo leer el catálogo de la base restaurada"
[[ "$TABLE_COUNT" -gt 0 ]] || die "La base restaurada no tiene tablas en public"

for table in Gym User Payment; do
  PRESENT="$(psql "$TARGET_URL" -X -q -A -t -v ON_ERROR_STOP=1 \
    -c "SELECT to_regclass('public.\"$table\"') IS NOT NULL")"
  [[ "$PRESENT" == "t" ]] || die "Falta la tabla esperada public.\"$table\""
done

echo "Tablas restauradas: $TABLE_COUNT"
for table in Gym User MembershipPlan Membership Payment Routine RoutineExercise WorkoutLog Class; do
  PRESENT="$(psql "$TARGET_URL" -X -q -A -t -v ON_ERROR_STOP=1 \
    -c "SELECT to_regclass('public.\"$table\"') IS NOT NULL")"
  if [[ "$PRESENT" == "t" ]]; then
    ROWS="$(psql "$TARGET_URL" -X -q -A -t -v ON_ERROR_STOP=1 \
      -c "SELECT count(*) FROM \"$table\"")"
    printf '  %-16s %s\n' "$table" "$ROWS"
  fi
done

CREATED=0
echo "OK: restauración verificada en '$TARGET_DB'."
echo "DATABASE_URL para staging: <misma credencial/host>/$TARGET_DB"
echo "No se usó --clean: la base se creó vacía y el dump se aplicó una sola vez."
