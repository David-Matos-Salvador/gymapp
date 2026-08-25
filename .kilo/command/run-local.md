Levanta el proyecto completo en local para desarrollo y testing:

1. Verifica que Docker esté corriendo:
```bash
docker info > /dev/null 2>&1 || (echo "Docker no está corriendo. Ábrelo primero." && exit 1)
```

2. Levanta la base de datos PostgreSQL y Redis si no están corriendo:
```bash
docker compose up -d db redis
```

3. Espera a que PostgreSQL esté healthy:
```bash
until docker compose exec db pg_isready -U gymuser -d gymdb 2>/dev/null; do
  echo "Esperando a PostgreSQL..."
  sleep 2
done
```

4. Resetea la base de datos con datos demo:
```bash
npm run db:reset
```

Si falla por falta de `DATABASE_URL`, usa la variable explícitamente:
```bash
DATABASE_URL="postgresql://gymuser:gympassword@localhost:5432/gymdb?schema=public" npm run db:reset
```

5. Verifica que el seed se ejecutó correctamente (debe mostrar "Seed completed!").

6. Inicia el servidor de desarrollo como background process:
```bash
npm run dev
```
Usa `background_process` para iniciarlo. Espera el patrón `ready` o `Local:` para confirmar que el servidor está listo.

7. Abre el navegador en http://localhost:3000 para verificar que la app carga correctamente.

8. Opcional: ejecuta los tests para validar todo:
```bash
npm run lint
npm run test
```

9. Reporta el resumen:
- DB: corriendo en localhost:5432
- Redis: corriendo en localhost:6379
- App: http://localhost:3000
- Tests: resultado del lint y vitest
