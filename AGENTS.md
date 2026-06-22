<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Theme Rule — Single Source of Truth

Este proyecto tiene **un solo sistema de tema**. `src/app/globals.css` es la única fuente de verdad para design tokens. No se permite: crear `tailwind.config.ts`, agregar otro sistema de temas (MUI, styled-components, etc.), ni definir variables de tema en otros archivos CSS. Ver regla completa en `.kilo/rules/theme.md`.

## DB Reset Rule

After implementing any feature or change that affects Prisma schema, API routes, or seed data, run:
```bash
npm run db:reset
```
This ensures the database is clean and populated with demo data before testing.
