<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Theme Rule — Single Source of Truth

Este proyecto tiene **un solo sistema de tema**. `src/app/globals.css` es la única fuente de verdad para design tokens. No se permite: crear `tailwind.config.ts`, agregar otro sistema de temas (MUI, styled-components, etc.), ni definir variables de tema en otros archivos CSS. Ver regla completa en `.kilo/rules/theme.md`.

## Textos — se habla de tú

La app trata al usuario de **tú**, en español neutro de Perú y LATAM: nada de "vos" ni "usted"
(`Elige`, `Puedes`, `Intenta`; no `Elegí`, `Podés`, `Intentá`). Con tildes y signos de apertura
(¿ ¡) completos, también en mensajes de error de la API.

## DB Reset Rule

After implementing any feature or change that affects Prisma schema, API routes, or seed data, run:

```bash
npm run db:reset
```

This ensures the database is clean and populated with demo data before testing.

## Quality Gate

Before finishing any change, run:

```bash
npm run validate
```

This runs `format:check`, `lint`, `typecheck` and unit tests. Full rules in `.kilo/rules/engineering-standards.md`.

## Cómo se trabaja en este repo

- **Tareas:** en GitHub Issues de este repo (etiquetas `prioridad-*` y de área). No crear listas de
  pendientes en archivos `.md`. `FEATURES_PENDIENTES.md` es la especificación detallada de algunas
  features y se enlaza desde sus issues.
- **Nunca hacer push directo a `main`.** Rama nueva desde `main` actualizado → PR → CI verde
  (Quality + E2E validation) → fusionar. Si la E2E falla en algo ajeno al cambio, reintentar una
  vez y anotar el caso intermitente como issue.
- **QA:** GitHub → Actions → Deploy → elegir la rama. **Producción:** solo con un tag `vX.Y.Z`
  sobre `main`. Un solo `Dockerfile` para todos los ambientes.
- **Migraciones:** se aplican solas al arrancar (`docker-entrypoint.sh`). Cuando exista
  producción, una migración publicada **no se edita ni se borra nunca**: solo se agregan nuevas.
- **Archivos subidos:** `src/lib/storage.ts` (SeaweedFS/S3 en servidor, `uploads/` en local).
- **Secretos:** solo en `.env` local y en Coolify. Nunca en el repo.
- **Mapa del servidor** (bases, Redis, SeaweedFS, dominios) y decisiones: repo `infra`,
  `PROJECTS.md` y `docs/decisions/` (ver 0008 para los ambientes de gymapp).
