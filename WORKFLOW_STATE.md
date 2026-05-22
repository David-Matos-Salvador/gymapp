# Workflow State — GymApp

> Última actualización: 2026-05-21T12:33:00-05:00  
> Gestionado por el `orchestrator`.  
> Estados: `pendiente` → `en-progress` → `testing` → `completada`

---

## 🔴 Pendientes (56 tareas — ver BACKLOG.md para detalle completo)

### Batch 1 — Arquitectura base (🔴 Alta, sin dependencias)
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-001 | Crear `middleware.ts` con protección por rol | backend-dev | 🔴 | — |
| T-002 | Agregar `loading.tsx` en todas las rutas (20+) | frontend-dev | 🔴 | T-001 |
| T-003 | Agregar `error.tsx` en todas las rutas (20+) | frontend-dev | 🔴 | T-001 |
| T-004 | Convertir páginas a Server Components | frontend-dev | 🟡 | T-001 |

### Batch 2 — API Routes faltantes
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-005 | `GET/PATCH /api/exercises/[id]` | backend-dev | 🔴 | — |
| T-006 | Verificar/fix `POST /api/upload` | backend-dev | 🔴 | — |
| T-007 | `GET/POST /api/notifications` + `PATCH .../read` | backend-dev | 🟡 | — |
| T-008 | `GET/PATCH /api/gyms/[id]` | backend-dev | 🟡 | — |
| T-009 | `GET/POST/PATCH /api/progress-photos` + DELETE | backend-dev | 🟡 | T-006 |
| T-010 | `GET /api/payments` + `PATCH /api/payments/[id]` | backend-dev | 🟡 | — |
| T-011 | `DELETE /api/check-ins/[id]` | backend-dev | 🟡 | — |
| T-012 | `GET /api/notifications/unread-count` | backend-dev | ⚪ | T-007 |
| T-013 | `POST/PATCH /api/bookings/[id]` | backend-dev | ⚪ | — |

### Batch 3 — Server Actions
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-014 | Crear `src/actions/` con Server Actions (6 archivos) | backend-dev | 🔴 | — |

### Batch 4 — Páginas faltantes
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-015 | Página `/exercise/[id]` | frontend-dev + ux-ui-designer | 🔴 | T-005, T-006 |
| T-016 | Centro de notificaciones `/notifications` | frontend-dev | 🟡 | T-007 |
| T-017 | Vista de membresía `/membresia` | frontend-dev | 🟡 | T-010 |
| T-018 | Página `/timer` | frontend-dev | 🟡 | — |
| T-019 | Landing pública `/gym/[slug]` | frontend-dev + ux-ui-designer | ⚪ | T-008 |

### Batch 5 — Features de FEATURES_PENDIENTES.md
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-020 | Compartir progreso (share workout summary) | frontend-dev | 🟡 | — |
| T-021 | Imágenes/GIFs de ejercicios | frontend-dev + backend-dev | 🟡 | T-005, T-006 |
| T-022 | Fotos de perfil / Avatar upload | frontend-dev + backend-dev | 🟡 | T-006 |
| T-023 | Encuesta post-workout | frontend-dev | 🟡 | — |
| T-024 | Planificación inteligente de splits por día | backend-dev + frontend-dev | 🟡 | — |
| T-025 | Racha diaria en `/rutina` | frontend-dev | ⚪ | — |
| T-026 | Multi-idioma PT-BR | arquitectura | ⚪ | — |

### Batch 6 — UI Components faltantes
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-027 | `NotificationBell` + `NotificationList` | frontend-dev + ux-ui-designer | 🔴 | T-007 |
| T-028 | `ProgressPhotoUpload` | frontend-dev | 🟡 | T-009 |
| T-029 | `ExerciseDetailView` | frontend-dev + ux-ui-designer | 🟡 | T-005, T-015 |
| T-030 | `PaymentForm` / `MembershipCard` | frontend-dev | 🟡 | T-010 |
| T-031 | `StripeCheckoutButton` | frontend-dev | 🟡 | T-032 |
| T-032 | `TrainerClientProgressChart` | frontend-dev | ⚪ | — |
| T-033 | Extraer landing page a componentes | frontend-dev | 🟡 | — |

### Batch 7 — Stripe
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-034 | `POST /api/stripe/checkout` | backend-dev | 🔴 | STRIPE_SECRET_KEY |
| T-035 | `POST /api/stripe/webhook` | backend-dev | 🔴 | T-034 |
| T-036 | `POST /api/stripe/create-customer` | backend-dev | 🟡 | T-034 |

### Batch 8 — Notificaciones Push/Email
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-037 | Integración Firebase Cloud Messaging | backend-dev + frontend-dev | 🟡 | T-007 |
| T-038 | Emails transaccionales (Resend) | backend-dev | 🟡 | — |

### Batch 9 — Testing
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-039 | Tests unitarios para hooks (3 hooks) | qa-tester | 🔴 | — |
| T-040 | Tests unitarios para funciones lib | qa-tester | 🔴 | — |
| T-041 | Tests integración API routes (34 endpoints) | qa-tester | 🔴 | — |
| T-042 | Tests de componentes (40+ componentes) | qa-tester | 🟡 | — |
| T-043 | Tests E2E adicionales | qa-tester | 🟡 | — |
| T-044 | Agregar script `test:ci` a package.json | devops-engineer | ⚪ | — |

### Batch 10 — Deuda técnica
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-045 | Unificar rutas español vs inglés | arquitectura | 🔴 | T-001 |
| T-046 | Fix `gym-violet` → usar opacidad de `accent-yellow` | ux-ui-designer | 🟡 | — |
| T-047 | Limpiar `src/components/landing/` vacío | frontend-dev | 🟡 | T-033 |
| T-048 | Revisar `src/types/exercise.ts` | frontend-dev | 🟡 | — |
| T-049 | Evaluar soft-delete en Prisma | backend-dev | 🟡 | — |
| T-050 | Fix ruta `/dashboard` → redirigir por rol | frontend-dev | ⚪ | T-001 |
| T-051 | Verificar uso de `@prisma/adapter-pg` | backend-dev | ⚪ | — |
| T-052 | Quitar video placeholder de Rick Roll en landing | frontend-dev | ⚪ | — |
| T-053 | Agregar `robots.txt` + `sitemap.xml` | frontend-dev | ⚪ | — |

### Batch 11 — Infra
| ID | Tarea | Agente | Prioridad | Bloqueada por |
|----|-------|--------|-----------|---------------|
| T-054 | GitHub Actions CI/CD | devops-engineer | 🟡 | — |
| T-055 | Script de backup de BD | devops-engineer | 🟡 | — |
| T-056 | Revisar `docker-compose.dev.yml` | devops-engineer | ⚪ | — |

---

## 🟡 En progreso

| ID | Tarea | Worktree | Agente | Iniciada |
|----|-------|----------|--------|----------|
| — | (ninguna aún) | — | — | — |

## 🟣 En testing (QA)

| ID | Tarea | Worktree | Rama a testear | QA asignado |
|----|-------|----------|----------------|-------------|
| — | (ninguna aún) | — | — | — |

## ✅ Completadas

| ID | Tarea | Worktree | Agente | Fecha |
|----|-------|----------|--------|-------|
| — | (ninguna aún) | — | — | — |
