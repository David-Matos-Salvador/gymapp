Despliega la aplicación con Docker:

1. Corre todos los tests y verificaciones:
```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
```

2. Build de la imagen Docker:
```bash
docker compose build --no-cache
```

3. Levanta los servicios:
```bash
docker compose up -d
```

4. Ejecuta migraciones de Prisma en producción:
```bash
docker compose exec app npx prisma migrate deploy
```

5. Verifica healthcheck:
```bash
curl http://localhost:3000/api/health
# debe devolver {"status":"ok"}
```

6. Revisa logs:
```bash
docker compose logs -f app
```
