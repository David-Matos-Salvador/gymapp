#!/usr/bin/env bash
set -euo pipefail

# Uso: ./scripts/worktree-setup.sh <suffix> <port> [redis-db]
# Crea una base de datos aislada y un .env.local para un worktree de validación.

suffix="${1:?Uso: $0 <suffix> <port> [redis-db]}"
port="${2:?Uso: $0 <suffix> <port> [redis-db]}"
redis_db="${3:-0}"
db="gymapp_fix_${suffix}"
db_url="postgresql://gymuser:gympassword@localhost:5432/${db}?schema=public"
redis_url="redis://localhost:6380/${redis_db}"
container="gymapp-db"

if ! docker ps --format '{{.Names}}' | grep -qx "$container"; then
  echo "El contenedor $container no está corriendo. Ejecutá: docker compose up -d db redis" >&2
  exit 1
fi

if ! docker exec "$container" psql -U gymuser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -qx 1; then
  docker exec "$container" psql -U gymuser -d postgres -c "CREATE DATABASE ${db}" >/dev/null
fi

if [ ! -d node_modules ]; then
  npm ci
fi

main_root="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
if [ -f "$main_root/.env" ]; then
  cp "$main_root/.env" .env.local
else
  : > .env.local
fi

{
  echo ""
  echo "DATABASE_URL=${db_url}"
  echo "REDIS_URL=${redis_url}"
  echo "AUTH_URL=http://localhost:${port}"
  echo "NEXT_PUBLIC_APP_URL=http://localhost:${port}"
  echo "PORT=${port}"
} >> .env.local

DATABASE_URL="$db_url" npx prisma db push --force-reset --skip-generate
DATABASE_URL="$db_url" npx tsx prisma/seed.ts

echo "Worktree listo:"
echo "  DB: ${db_url}"
echo "  Redis: ${redis_url}"
echo "  App: http://localhost:${port}"
echo "Usá: DATABASE_URL='${db_url}' NEXT_PUBLIC_APP_URL='http://localhost:${port}' PORT=${port} npm run test:validation"
