# Decisiones del juez — ADMIN

Base: `docs/roles/admin/audit.md` (ADM-01..16), `docs/quality/role-quality-loop.md`, rama `fix/validation-batch-1`.

## Políticas

1. ADMIN **no** edita/borra rutinas de trainers; solo ver, duplicar y asignar. Dueño o SUPER editan.
2. Catálogo global de ejercicios exclusivo de SUPER_ADMIN. ADMIN solo activa/desactiva para su gym.
3. Cobro manual solo en membresía ACTIVE vigente y sin pago. Vencida/inactiva: 409, renovar primero.
4. `Payment` es la única fuente de pago. ADMIN no puede setear `paymentConfirmed`, estado ni fechas por PATCH.
5. Clases por gym. ADMIN gestiona las de su gym; TRAINER solo las propias. `Class.gymId` obligatorio tras backfill.
6. Owner sin rol ADMIN no opera: se promueve a ADMIN. La propiedad no autoriza.
7. Plan inactivo bloquea altas nuevas; renovación same-plan solo ADMIN con aviso. Snapshot de precio/moneda/duración.
8. Pagos legacy sin `membershipId`: backfill con match único; ambiguos a cola separada; nunca descartar.
9. ADMIN crea miembros y membresías en su gym; TRAINER no crea membresías. Alta con invitación segura.
10. KPIs solo MEMBER, pagadas/vigentes y Payment del gym; sin fallback global.

## Decisiones

| ID     | Decisión      | Sev.  |
| ------ | ------------- | ----- |
| ADM-01 | FIX           | Alta  |
| ADM-02 | FIX           | Alta  |
| ADM-03 | FIX + FEATURE | Alta  |
| ADM-04 | FIX           | Alta  |
| ADM-05 | FIX           | Alta  |
| ADM-06 | FIX           | Alta  |
| ADM-07 | FIX           | Media |
| ADM-08 | FIX           | Media |
| ADM-09 | FIX + FEATURE | Media |
| ADM-10 | FEATURE + FIX | Media |
| ADM-11 | UX            | Media |
| ADM-12 | FIX           | Media |
| ADM-13 | FIX           | Media |
| ADM-14 | FIX           | Media |
| ADM-15 | FIX           | Media |
| ADM-16 | UX            | Baja  |

## Workstreams

1. **WS1 — Seguridad/aislamiento:** ADM-01/02/03(scope)/04/05/06/07/13. Gate: matriz cross-gym + E2E.
2. **WS2 — Integridad/migraciones:** `Class.gymId` NOT NULL, snapshot de precio, `Exercise.active`, `Payment.membershipId` Restrict, backfills; ADM-08/09/10(API)/14/15(backend).
3. **WS3 — Operación ADMIN:** directorio/alta de miembros, alta de membresías, trainers, ledger, clases/roster, perfil del gym.
4. **WS4 — UX/validaciones/a11y/métricas:** ADM-11/12/15(UI)/16, estados, responsive, dark mode.

## Diferido

Audit log, analítica avanzada/churn, exportación, reembolsos, contabilidad completa, campañas segmentadas, multi-rol, catálogo por gym, waitlist/QR, versionado completo de planes, Stripe, importación masiva, payroll.

## Estado

- WS1 implementado y validado: E2E **65/65**, `npm run validate` **212 tests**.
- Próximo: WS2 (migraciones/backfills) y luego WS3/WS4.
