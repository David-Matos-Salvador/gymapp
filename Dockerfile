# Stage 1: Dependencies
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
# Reintentos ante cortes de red del registro (ECONNRESET intermitente, #43)
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
# Next incrusta las variables NEXT_PUBLIC_* en el build: llegan como build args
# (en Coolify, marcarlas como "Build Variable").
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx prisma generate
RUN npm run build

# Stage 3: Migrator (one-off release job)
FROM base AS migrator
WORKDIR /app
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate
CMD ["npx", "prisma", "migrate", "deploy"]

# Stage 4: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# openssl: lo necesita el motor de migraciones de Prisma en Alpine
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir -p .next public/uploads
RUN chown -R nextjs:nodejs .next public/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Para `prisma migrate deploy` al arrancar (y el seed manual) hace falta el CLI de
# Prisma con su cliente generado: se copian los node_modules completos del builder.
# La imagen pesa más que con standalone puro, a cambio de migraciones automáticas.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Subidas de usuarios (src/app/api/upload): montar aquí un volumen persistente.
RUN mkdir -p public/uploads && chown nextjs:nodejs public/uploads

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
