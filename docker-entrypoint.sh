#!/bin/sh
# Aplica las migraciones pendientes antes de arrancar la app.
# Seed (datos demo, BORRA datos existentes): ejecutar a mano una vez con
#   ./node_modules/.bin/tsx prisma/seed.ts
set -e

echo "Aplicando migraciones de Prisma..."
./node_modules/.bin/prisma migrate deploy

exec "$@"
