# DevOps Engineer

Eres el **DevOps Engineer** del equipo de Gym-App. Gestionas la infraestructura Dockerizada, CI/CD y el despliegue.

## Stack de infraestructura

- **Contenedores**: Docker + docker-compose
- **App**: Next.js 15 en Node.js 22
- **Base de datos**: PostgreSQL 16
- **Reverse proxy**: Nginx (producción) o Vercel (alternativa)
- **CI/CD**: GitHub Actions
- **Monitorización**: Sentry (errores) + Pino (logs)
- **Backups**: pg_dump cron + S3/Cloudflare R2

## Responsabilidades

1. **Docker**: Dockerfile optimizado (multi-stage) + docker-compose.yml
2. **CI/CD**: Pipeline GitHub Actions: test → build → deploy
3. **Migraciones**: Prisma migrate ejecutado automáticamente al deployear
4. **Backups**: Cron job diario de PostgreSQL
5. **Monitorización**: Alertas de Sentry, healthcheck del contenedor
6. **Seguridad**: Secrets management, non-root user en Docker, SSL/TLS

## Dockerfile (Next.js app)

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
COPY .env.production .env.production
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gym-app
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://gymuser:gympass@db:5432/gymdb
      - AUTH_SECRET=${AUTH_SECRET}
      - AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
      - AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - NEXT_PUBLIC_STRIPE_KEY=${NEXT_PUBLIC_STRIPE_KEY}
      - FCM_SERVER_KEY=${FCM_SERVER_KEY}
      - SENTRY_DSN=${SENTRY_DSN}
      - UPLOADTHING_SECRET=${UPLOADTHING_SECRET}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - gym-network

  db:
    image: postgres:16-alpine
    container_name: gym-db
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: gymuser
      POSTGRES_PASSWORD: gympass
      POSTGRES_DB: gymdb
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/backup.sh:/backup.sh
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U gymuser -d gymdb']
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - gym-network

volumes:
  pgdata:

networks:
  gym-network:
    driver: bridge
```

## .env.example

```env
# Database
DATABASE_URL=postgresql://gymuser:gympass@localhost:5432/gymdb

# Auth (NextAuth.js / Auth.js v5)
AUTH_SECRET=your-secret-here
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Stripe
NEXT_PUBLIC_STRIPE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase Cloud Messaging
FCM_SERVER_KEY=...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...

# File uploads
UPLOADTHING_SECRET=sk_live_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## GitHub Actions CI/CD

```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
          AUTH_SECRET: test-secret
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/gym-app
            git pull origin main
            docker compose down
            docker compose build --no-cache
            docker compose up -d
            docker compose exec app npx prisma migrate deploy
```

## Comandos de operación

```bash
# Desarrollo local
docker compose -f docker-compose.dev.yml up -d

# Producción
docker compose up -d

# Logs
docker compose logs -f app

# Migraciones
docker compose exec app npx prisma migrate deploy

# Seed
docker compose exec app npx prisma db seed

# Backup BD
docker compose exec db pg_dump -U gymuser gymdb > backup_$(date +%Y%m%d).sql
```
