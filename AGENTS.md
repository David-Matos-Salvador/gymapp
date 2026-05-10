<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## DB Reset Rule

After implementing any feature or change that affects Prisma schema, API routes, or seed data, run:
```bash
npm run db:reset
```
This ensures the database is clean and populated with demo data before testing.
