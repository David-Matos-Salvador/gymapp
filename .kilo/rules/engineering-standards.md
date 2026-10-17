# Engineering Standards

## Quality gate

Antes de dar una tarea por terminada, ejecutar:

```bash
npm run validate   # format:check + lint + typecheck + test
```

Si el cambio toca Prisma, API routes o seed data, ejecutar además `npm run db:reset`.

## Herramientas y versiones

| Área       | Herramienta                     | Configuración          |
| ---------- | ------------------------------- | ---------------------- |
| Runtime    | Node.js 22                      | `.nvmrc`               |
| Formato    | Prettier                        | `.prettierrc.json`     |
| Lint       | ESLint 9 + eslint-config-next   | `eslint.config.mjs`    |
| Tipos      | TypeScript strict               | `tsconfig.json`        |
| Unit tests | Vitest                          | `vitest.config.ts`     |
| E2E        | Playwright                      | `playwright.config.ts` |
| CI         | GitHub Actions                  | `.github/workflows/`   |

## Reglas

- **Formato**: todo archivo de código debe pasar `prettier --check`. No editar manualmente el estilo; usar `npm run format`.
- **TypeScript**: `strict` activo. Evitar `any`; si es inevitable, justificar con un comentario `eslint-disable-next-line` puntual.
- **Lint**: no introducir errores nuevos. Las advertencias existentes (`<img>` en imágenes dinámicas, React Compiler con `watch()`) están aceptadas; no agregar más.
- **Tests**: lógica nueva en `src/` debe incluir tests en `src/**/__tests__/`. Los flujos de usuario van en `e2e/`.
- **Artefactos**: no commitear `.next/`, `playwright-report/`, `test-results/`, `coverage/`, `*.tsbuildinfo` ni `node_modules/`.
- **Secretos**: nunca commitear `.env`; los valores de ejemplo van en `.env.example`.

## Tooling del agente

- **Context7 MCP**: documentación actualizada de Next.js, Prisma y React. Usarlo antes de asumir APIs.
- **postgres MCP**: DBHub en modo solo lectura (`execute_sql`, máx. 200 filas, timeout 15s). Lee `DATABASE_URL` desde `.env`; no usar `{env:...}` en la config del proyecto (Kilo la rechaza).
- **env-guard plugin**: bloquea leer o editar `.env*` (excepto `.env.example`).
- **Skills instaladas**: `prisma-cli`, `prisma-client-api`, `prisma-orm-setup`, `code-review`, `security-and-hardening`, más las de Next/React/UI/testing ya existentes.

## Scripts

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción
npm run format       # aplicar Prettier
npm run format:check # verificar formato
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run test:validation # simulación multi-usuario; resetea BD y genera VALIDATION_REPORT.md
npm run validate     # gate completo (sin E2E)
```
