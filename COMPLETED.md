# Tareas Completadas — GymApp

> Este archivo registra las tareas que han pasado por el ciclo completo:  
> implementación → QA → merge. Gestionado por el `orchestrator`.

---

## Completadas — 2026-05-22 (batch audit)

| ID   | Tarea                                                                               | Worktree | Agente | Fecha      |
| ---- | ----------------------------------------------------------------------------------- | -------- | ------ | ---------- |
| 1.2  | `loading.tsx` en todas las rutas que consultan datos (29 archivos)                  | —        | —      | 2026-05-22 |
| 1.3  | `error.tsx` en todas las rutas (32 archivos)                                        | —        | —      | 2026-05-22 |
| 2.1  | `GET/PATCH /api/exercises/[id]` — CRUD de ejercicio individual                      | —        | —      | 2026-05-22 |
| 2.2  | `POST /api/upload` — Subida de imágenes/videos con storage local `/public/uploads/` | —        | —      | 2026-05-22 |
| 2.3  | `GET/POST /api/notifications` y `PATCH /api/notifications/[id]/read`                | —        | —      | 2026-05-22 |
| 2.4  | `GET/PATCH /api/gyms/[id]` — Detalle y actualización de gym                         | —        | —      | 2026-05-22 |
| 2.5  | `GET/POST/PATCH /api/progress-photos` y `DELETE /api/progress-photos/[id]`          | —        | —      | 2026-05-22 |
| 2.6  | `GET /api/payments` y `PATCH /api/payments/[id]` — Historial y gestión de pagos     | —        | —      | 2026-05-22 |
| 2.7  | `DELETE /api/check-ins/[id]` — Eliminar check-in                                    | —        | —      | 2026-05-22 |
| 2.8  | `GET /api/notifications/unread-count` — Badge de notificaciones no leídas           | —        | —      | 2026-05-22 |
| 2.9  | `GET/PATCH /api/bookings/[id]` — Detalle y actualización de booking (excede spec)   | —        | —      | 2026-05-22 |
| 3.1  | `src/actions/` — Server Actions para mutaciones (6 archivos)                        | —        | —      | 2026-05-22 |
| 4.1  | `/exercise/[id]` — Página de detalle de ejercicio                                   | —        | —      | 2026-05-22 |
| 4.2  | `/notifications` — Centro de notificaciones                                         | —        | —      | 2026-05-22 |
| 4.3  | `/membresia` — Vista de membresía del miembro                                       | —        | —      | 2026-05-22 |
| 4.4  | `/timer` — Página de timer de descanso                                              | —        | —      | 2026-05-22 |
| 4.5  | `/gym/[slug]` — Landing pública por gimnasio                                        | —        | —      | 2026-05-22 |
| 5.1  | `share-progress.tsx` — Compartir progreso post-workout                              | —        | —      | 2026-05-22 |
| 5.2  | Imágenes/GIFs de ejercicios (upload API + exercise detail)                          | —        | —      | 2026-05-22 |
| 5.3  | Fotos de perfil / Avatar upload (vía upload API)                                    | —        | —      | 2026-05-22 |
| 5.4  | `post-workout-survey.tsx` — Encuesta de satisfacción post-workout                   | —        | —      | 2026-05-22 |
| 5.6  | `daily-streak.tsx` — Racha diaria en `/rutina`                                      | —        | —      | 2026-05-22 |
| 6.2  | `photo-upload.tsx` — Componente de subida de fotos de progreso                      | —        | —      | 2026-05-22 |
| 6.3  | `exercise-detail.tsx` — Vista completa de ejercicio con video/GIF/historial         | —        | —      | 2026-05-22 |
| 6.4  | `membership-card.tsx` + `payment-form.tsx` — UI de pagos y membresía                | —        | —      | 2026-05-22 |
| 6.6  | `client-progress-chart.tsx` — Gráficos de progreso para coach                       | —        | —      | 2026-05-22 |
| 6.7  | Extracción de landing page a `src/components/landing/` (8 componentes)              | —        | —      | 2026-05-22 |
| 7.1  | `POST /api/stripe/checkout` — Crear sesión de checkout Stripe                       | —        | —      | 2026-05-22 |
| 7.2  | `POST /api/stripe/webhook` — Webhook de eventos Stripe                              | —        | —      | 2026-05-22 |
| 7.3  | `POST /api/stripe/create-customer` — Crear customer en Stripe                       | —        | —      | 2026-05-22 |
| 9.1  | Tests unitarios para hooks (3 archivos en `src/hooks/__tests__/`)                   | —        | —      | 2026-05-22 |
| 9.6  | NPM script `test:ci` agregado a `package.json`                                      | —        | —      | 2026-05-22 |
| 10.2 | Color `gym-violet` — Referencias eliminadas del código                              | —        | —      | 2026-05-22 |
| 10.3 | Carpeta `src/components/landing/` — Poblada con 8 componentes                       | —        | —      | 2026-05-22 |
| 10.4 | `src/types/exercise.ts` — Verificado en uso por 3 componentes                       | —        | —      | 2026-05-22 |
| 10.6 | Ruta `/dashboard` — Redirige por rol correctamente                                  | —        | —      | 2026-05-22 |
| 10.7 | `src/lib/prisma.ts` — Verificado: usa `@prisma/adapter-pg` correctamente            | —        | —      | 2026-05-22 |
| 10.8 | Video placeholder de Rick Astley — Eliminado de landing page                        | —        | —      | 2026-05-22 |
| 11.1 | GitHub Actions CI — `.github/workflows/ci.yml` creado                               | —        | —      | 2026-05-22 |
| 11.2 | Script de backup de BD — `scripts/backup.sh` creado                                 | —        | —      | 2026-05-22 |

**Total: 40 tareas completadas**
