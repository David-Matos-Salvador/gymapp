#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL no está definida}"
: "${BACKUP_DIR:=./backups}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/contabo-$TIMESTAMP.dump"

echo "Creando backup en $BACKUP_FILE"
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE" \
  "$DATABASE_URL"

if ! pg_restore --list "$BACKUP_FILE" >/dev/null; then
  echo "ERROR: el backup no se pudo leer con pg_restore --list" >&2
  exit 1
fi

echo "Backup verificado: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_FILE"
else
  shasum -a 256 "$BACKUP_FILE"
fi

echo "Guardá el archivo y el hash fuera del servidor antes de continuar."
