Reinicia la base de datos y la vuelve a alimentar con datos demo.

1. Verifica que el contenedor de PostgreSQL esté corriendo:
```bash
docker compose ps db
```
Si no está corriendo, levántalo:
```bash
docker compose up -d db
```

2. Resetea la base de datos (borra, recrea migraciones y ejecuta seed):
```bash
npm run db:reset
```

3. Confirma que el seed se ejecutó correctamente verificando que el último output diga "🎉 Seed completed!".

Si falla por falta de `DATABASE_URL`, exporta la variable manualmente:
```bash
DATABASE_URL="postgresql://gymuser:gympassword@localhost:5432/gymdb?schema=public" npm run db:reset
```
