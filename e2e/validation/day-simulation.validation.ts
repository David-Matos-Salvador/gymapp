import { execSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test"
import {
  cleanupClass,
  closeDb,
  countMeasurements,
  countUsers,
  countWorkouts,
  createPendingMembership,
  expireInvite,
  expireMembership,
  findUser,
  getClassBookingCount,
  getLatestPayment,
  getMembership,
  hasBookingForClass,
  renewMembership,
  snapshot,
} from "./db"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const PASSWORD = "demo123"
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-")
const STARTED_AT = new Date().toISOString()
const UNIQUE = Date.now().toString(36)
const NEW_MEMBER_EMAIL = `validacion-${UNIQUE}@gymapp.com`
const NEW_CLIENT_EMAIL = `cliente-${UNIQUE}@gymapp.com`
const NEW_INVITE_EMAIL = `invitado-${UNIQUE}@gymapp.com`
const TEST_EXERCISE = `Ejercicio Validación ${UNIQUE}`
const TEST_EQUIPMENT = `Equipo Validación ${UNIQUE}`
const TEST_ROUTINE = `Rutina Validación ${UNIQUE}`
const TEST_CLASS = `Clase Validación ${UNIQUE}`
const CONCURRENCY_CLASS = `Clase Concurrencia ${UNIQUE}`
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
  "base64"
)
const EVIDENCE_DIR = join(process.cwd(), "screenshots", "validation", RUN_ID)
const REPORT_MD = join(process.cwd(), "VALIDATION_REPORT.md")
const REPORT_JSON = join(process.cwd(), "VALIDATION_REPORT.json")

const USERS = {
  admin: "admin@gymapp.com",
  trainer: "trainer@gymapp.com",
  trainer2: "trainer2@gymapp.com",
  carlos: "carlos@gymapp.com",
  mateo: "mateo@gymapp.com",
  laura: "laura@gymapp.com",
  sofia: "sofia@gymapp.com",
  valentina: "valentina@gymapp.com",
  ricardo: "ricardo@gymapp.com",
  ana: "ana@gymapp.com",
  roberto: "roberto@gymapp.com",
  superadmin: "superadmin@gymapp.com",
} as const

type UserKey = keyof typeof USERS
type Status = "passed" | "failed"

interface Session {
  context: BrowserContext
  page: Page
  errors: string[]
}

interface StepResult {
  id: string
  phase: string
  role: string
  expected: string
  status: Status
  durationMs: number
  error?: string
  url?: string
  evidence?: string
  notes?: string
}

const sessions = new Map<UserKey, Session>()
const results: StepResult[] = []
let dbBefore: Awaited<ReturnType<typeof snapshot>> | null = null
let dbAfter: Awaited<ReturnType<typeof snapshot>> | null = null

test.describe.configure({ mode: "serial" })
test.setTimeout(20 * 60_000)

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/\u001b\[[0-9;]*m/g, "")
}

async function login(browser: Browser, email: string): Promise<Session> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  const errors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`)
  })
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`)
  })

  await page.goto("/login", { waitUntil: "networkidle" })
  await page.waitForTimeout(300)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole("button", { name: /iniciar sesión/i }).click()
  await page.waitForTimeout(500)

  const submittedByGet = new URL(page.url()).searchParams.has("email")
  if (submittedByGet) {
    throw new Error("El login se envió por GET nativo: la página no estaba hidratada")
  }

  await page.waitForURL(/\/(dashboard|rutinas|onboarding|admin)/, { timeout: 25_000 })
  await page.waitForTimeout(500)

  return { context, page, errors }
}

function requireSession(key: UserKey): Session {
  const session = sessions.get(key)
  if (!session) throw new Error(`No hay sesión para ${key}; el login falló`)
  return session
}

async function openAnonymous(browser: Browser, path: string) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(path, { waitUntil: "domcontentloaded" })
  return { context, page }
}

async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(700)
}

async function runStep(
  id: string,
  meta: { phase: string; role: string; expected: string; notes?: string },
  page: Page | null,
  fn: () => Promise<void>
) {
  const started = Date.now()
  try {
    await fn()
    results.push({
      id,
      ...meta,
      status: "passed",
      durationMs: Date.now() - started,
    })
  } catch (error) {
    const evidence = page ? join(EVIDENCE_DIR, `${id}.png`) : undefined
    if (page && evidence) {
      await page.screenshot({ path: evidence, fullPage: true }).catch(() => {})
    }
    results.push({
      id,
      ...meta,
      status: "failed",
      durationMs: Date.now() - started,
      error: errorMessage(error),
      url: page?.url(),
      evidence,
    })
  }
}

async function completeWorkout(page: Page) {
  await visit(page, "/rutinas")
  await expect(page.getByText(/Hola,/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/Mis entrenamientos/i)).toBeVisible({ timeout: 20_000 })

  const split = page
    .locator("button:has(p.font-medium)")
    .filter({ hasNot: page.locator("[disabled]") })
    .first()
  await expect(split).toBeVisible({ timeout: 20_000 })
  await split.click()
  await page.waitForURL(/\/entrenar\//, { timeout: 20_000 })
  const planId = page.url().match(/\/rutinas\/([^/]+)\/entrenar\//)?.[1] ?? ""
  await page.getByRole("button", { name: /iniciar entrenamiento/i }).click()
  await page.waitForTimeout(1000)

  for (let exercise = 0; exercise < 10; exercise++) {
    const restSkip = page.getByRole("button", { name: /^Saltar$/i })
    if (await restSkip.isVisible({ timeout: 1000 }).catch(() => false)) {
      await restSkip.click()
      await page.waitForTimeout(300)
    }

    const details = page.getByRole("button", { name: /Detalle de series/i })
    if (await details.isVisible({ timeout: 1000 }).catch(() => false)) {
      const label = (await details.textContent().catch(() => "")) ?? ""
      if (label.includes("(0/")) await details.click()
    }

    for (let action = 0; action < 15; action++) {
      let clickedSet = false
      for (const name of ["1", "2", "3", "4", "5", "6"]) {
        const setButton = page.getByRole("button", { name, exact: true })
        if (!(await setButton.isVisible({ timeout: 300 }).catch(() => false))) continue
        if (await setButton.isDisabled().catch(() => true)) continue
        await setButton.click()
        await page.waitForTimeout(300)
        clickedSet = true
        break
      }
      if (clickedSet) continue

      const skipRest = page.getByRole("button", { name: /Saltar descanso|^Saltar$/i })
      if (await skipRest.isVisible({ timeout: 500 }).catch(() => false)) {
        await skipRest.click()
        await page.waitForTimeout(300)
        continue
      }
      break
    }

    const next = page.getByRole("button", { name: /^Continuar$/i })
    if (await next.isVisible({ timeout: 1500 }).catch(() => false)) {
      await next.click()
      await page.waitForTimeout(800)
      continue
    }
    break
  }

  await page
    .getByText(/Entrenamiento registrado|Entrenamiento completado/i)
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })
    .catch(() => {})
  await page.waitForTimeout(1000)

  await visit(page, "/rutinas")
  await expect(page.getByText(/Hola,/i)).toBeVisible({ timeout: 20_000 })
  return planId
}

async function toast(page: Page, text: RegExp) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 })
}

test.beforeAll(async () => {
  mkdirSync(EVIDENCE_DIR, { recursive: true })

  if (process.env.VALIDATION_SKIP_RESET !== "1") {
    execSync("npm run db:reset", {
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: Number(process.env.VALIDATION_RESET_TIMEOUT ?? 300_000),
      env: { ...process.env, CI: "1" },
    })
  }

  dbBefore = await snapshot()
})

test.afterAll(async () => {
  dbAfter = await snapshot().catch(() => null)

  const passed = results.filter((item) => item.status === "passed").length
  const failed = results.filter((item) => item.status === "failed").length

  const consoleErrors = Array.from(sessions.entries())
    .map(([key, session]) => ({
      user: key,
      errors: Array.from(new Set(session.errors)),
    }))
    .filter((entry) => entry.errors.length > 0)

  const knownFindings = [
    {
      id: "F-01",
      severity: "Alta",
      area: "Autenticación",
      title: "La contraseña puede terminar en la URL si el formulario se envía antes de hidratar",
      detail:
        "El formulario de /login no define method y depende de onSubmit. Si el usuario envía antes de que React hidrate, el navegador hace un GET nativo y expone email/password en el query string, historial y logs.",
      evidence: "Run 2026-10-17T13-48-04-133Z: /login?email=...&password=...",
      file: "src/app/login/page.tsx",
      fix: 'Agregar method="post" al <form> y mantener onSubmit; opcionalmente deshabilitar el submit hasta que el componente esté montado.',
    },
    {
      id: "F-02",
      severity: "Baja",
      area: "Progreso",
      title: "Recharts advierte width(-1) y height(-1) al montar los gráficos",
      detail:
        "Los gráficos de /progress renderizan, pero Recharts emite warnings de dimensiones inválidas durante el montaje. Puede causar parpadeo o gráficos incompletos en pantallas pequeñas.",
      evidence: "Consola del dev server durante la fase de progreso",
      file: "src/components/charts/progress-chart.tsx",
      fix: "Definir una altura mínima/explícita en el contenedor de los charts o usar ResponsiveContainer con height fijo.",
    },
    {
      id: "F-03",
      severity: "Baja",
      area: "Historial",
      title: "El historial de entrenamientos es un placeholder",
      detail:
        "La ruta /rutinas/[planId]/historial muestra 'en construcción' en lugar del historial real de sesiones.",
      evidence: "Paso workout-historial",
      file: "src/app/rutinas/[planId]/historial/page.tsx",
      fix: "Implementar la consulta de WorkoutLog del plan y renderizar el historial.",
    },
    {
      id: "F-04",
      severity: "Media",
      area: "Admin / Membresías",
      title: "Las membresías INACTIVE no aparecen en ningún tab",
      detail:
        "El panel de admin filtra Pendientes/Activas/Vencidas; una membresía con status INACTIVE queda fuera de los tres filtros y es invisible para el admin.",
      evidence: "Paso admin-ricardo-inactiva-visible",
      file: "src/components/admin/membership-panel.tsx",
      fix: "Incluir INACTIVE en el filtro de vencidas o agregar un tab/estado 'Inactiva'.",
    },
    {
      id: "F-05",
      severity: "Alta",
      area: "Pagos / Membresías",
      title: "Subir comprobante confirma la membresía sin revisión",
      detail:
        "POST /api/payments/receipt crea el Payment en PENDING pero actualiza la Membership con paymentConfirmed=true. El miembro queda activo antes de que el admin revise.",
      evidence: "Paso valentina-sube-comprobante",
      file: "src/app/api/payments/receipt/route.ts",
      fix: "No tocar paymentConfirmed en el upload; confirmar la membresía solo al aprobar el Payment.",
    },
    {
      id: "F-06",
      severity: "Alta",
      area: "Pagos / Membresías",
      title: "Rechazar el comprobante no revierte la membresía",
      detail:
        "PUT /api/payments/[id] con REJECT marca el Payment como FAILED, pero la Membership ya fue confirmada por el upload y sigue activa.",
      evidence: "Paso admin-rechaza-pago-valentina",
      file: "src/app/api/payments/[id]/route.ts",
      fix: "Al rechazar un pago de tipo MEMBERSHIP, revertir paymentConfirmed/estado de la membresía.",
    },
    {
      id: "F-07",
      severity: "Alta",
      area: "Admin / Membresías",
      title: "Renovar membresía muestra éxito pero no extiende la fecha",
      detail:
        "El panel envía startDate/endDate al PATCH /api/memberships/[id], pero el schema Zod no incluye esas fechas y las descarta. La API responde 200 y el toast dice 'renovada', pero endDate queda en el pasado.",
      evidence: "Paso admin-renueva-ricardo: endDate recibido = ayer, esperado > ahora",
      file: "src/app/api/memberships/[id]/route.ts",
      fix: "Agregar startDate/endDate al updateMembershipSchema y validar que endDate > startDate.",
    },
    {
      id: "F-08",
      severity: "Alta",
      area: "Onboarding / Rutinas",
      title: "La generación de rutina falla con 500 por nombre de ejercicio duplicado",
      detail:
        "POST /api/fitness-coach hace findFirst + create de Exercise sin manejar concurrencia. Si el nombre ya existe (o dos requests compiten), Prisma lanza P2002 y el onboarding no genera planes. Es intermitente: ocurrió en el run 2026-10-17T20-12-53-320Z y no se reprodujo en la corrida final.",
      evidence:
        "Run 2026-10-17T20-12-53-320Z: POST /api/fitness-coach 500 (P2002 Exercise.name); paso onboarding-completo",
      file: "src/app/api/fitness-coach/route.ts:488",
      fix: "Usar upsert por name o capturar P2002 y volver a consultar el ejercicio existente.",
    },
    {
      id: "F-09",
      severity: "Alta",
      area: "Clases / Reservas",
      title: "Dos reservas simultáneas pueden exceder la capacidad",
      detail:
        "POST /api/bookings cuenta las reservas y luego crea, sin transacción ni lock. Con capacidad 1, dos requests concurrentes devolvieron 201 y dejaron 2 reservas confirmadas.",
      evidence: "Paso clase-concurrencia: statuses [201, 201] en vez de [201, 409]",
      file: "src/app/api/bookings/route.ts",
      fix: "Hacer count+create en una transacción serializable o agregar un constraint/upsert atómico por cupo.",
    },
    {
      id: "F-10",
      severity: "Baja",
      area: "Accesibilidad",
      title: "CardTitle no renderiza un heading semántico",
      detail:
        "El componente CardTitle usa un div. Títulos importantes como 'Únete como cliente' o 'Confirmar pago' no son headings para lectores de pantalla ni para getByRole('heading').",
      evidence: "La página /invite/[token] no exponía el título como heading",
      file: "src/components/ui/card.tsx",
      fix: "Renderizar CardTitle como h2 (o exponer asChild) y usar h1 en títulos de página.",
    },
    {
      id: "F-11",
      severity: "Alta",
      area: "Auth / API",
      title: "IDOR: cualquier usuario autenticado puede modificar membresías ajenas",
      detail:
        "PATCH /api/memberships/[id] solo valida que haya sesión; no verifica rol ni ownership. Un MEMBER puede cambiar status/paymentConfirmed de la membresía de otro usuario.",
      evidence: "Paso auth-idor-membership: Carlos modifica la membresía de Ana",
      file: "src/app/api/memberships/[id]/route.ts",
      fix: "Exigir ADMIN/SUPER_ADMIN para cambios arbitrarios; si se permite auto-renovación, limitarla a la propia membresía y nunca aceptar paymentConfirmed=true desde el cliente.",
    },
  ]

  const report = {
    runId: RUN_ID,
    startedAt: STARTED_AT,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: { total: results.length, passed, failed },
    dbBefore,
    dbAfter,
    results,
    consoleErrors,
    knownFindings,
    notValidated: [
      "Google OAuth (requiere una cuenta real de Google)",
      "Stripe checkout y webhook (claves vacías en .env)",
      "Envío real de emails y push notifications",
      "Subida de archivos fuera del filesystem local",
      "Comportamiento real de SSE durante horas (solo se probó el evento de pago)",
      "Landing público /gym/[slug] y detalle /exercise/[id]",
      "Gestión de plataforma del super-admin más allá del dashboard",
    ],
    coverageNotes: [
      "12 usuarios con sesiones simultáneas, cada uno en su propio contexto de navegador.",
      "Time travel aplicado en BD: membresía de Sofía vencida → renovada +30 días, Ricardo INACTIVE → EXPIRED → renovado, e invitación expirada.",
      "Se verificó persistencia real: WorkoutLog, BodyMeasurement, Booking, Notification y Payment.",
      "Se cubrieron CRUDs de admin (ejercicio/equipo), coach (rutina/cliente/invitación/clase), onboarding completo y timer.",
      "El E2E existente e2e/workout.spec.ts no verificaba la persistencia del entrenamiento; este runner sí lo hace.",
    ],
  }

  writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2))

  const failureSections = results
    .filter((item) => item.status === "failed")
    .map(
      (item, index) => `### ${index + 1}. [${item.role}] ${item.id}

- **Fase:** ${item.phase}
- **Esperado:** ${item.expected}
- **Error:** ${item.error ?? "Sin detalle"}
- **URL:** ${item.url ?? "n/a"}
- **Evidencia:** ${item.evidence ?? "sin captura"}
`
    )
    .join("\n")

  const stepRows = results
    .map(
      (item) =>
        `| ${item.id} | ${item.phase} | ${item.role} | ${item.expected} | ${item.status === "passed" ? "OK" : "FALLO"} | ${item.durationMs} ms |`
    )
    .join("\n")

  const consoleSection =
    consoleErrors.length === 0
      ? "Sin errores de consola o HTTP 5xx registrados."
      : consoleErrors
          .map(
            (entry) =>
              `### ${entry.user}\n\n${entry.errors.map((error) => `- ${error}`).join("\n")}`
          )
          .join("\n\n")

  const consoleNote = consoleErrors.some((entry) =>
    entry.errors.some((error) => error.includes("403"))
  )
    ? "Los 403 de sofia y ricardo son esperados: corresponden a los tests negativos de reserva con membresía vencida/inactiva.\n\n"
    : ""

  const markdown = `# Validation Report — ${RUN_ID}

## Resumen

- **URL:** ${BASE_URL}
- **Fecha:** ${new Date().toISOString()}
- **Pasos:** ${results.length}
- **OK:** ${passed}
- **Fallos:** ${failed}
- **DB antes:** ${JSON.stringify(dbBefore)}
- **DB después:** ${JSON.stringify(dbAfter)}

## Fallos

${failureSections || "No se detectaron fallos."}

## Pasos ejecutados

| ID | Fase | Rol | Esperado | Resultado | Duración |
| --- | --- | --- | --- | --- | --- |
${stepRows}

## Errores de consola / red

${consoleNote}${consoleSection}

## Hallazgos adicionales

${knownFindings
  .map(
    (finding) => `### ${finding.id} — ${finding.title}

- **Severidad:** ${finding.severity}
- **Área:** ${finding.area}
- **Detalle:** ${finding.detail}
- **Evidencia:** ${finding.evidence}
- **Archivo probable:** \`${finding.file}\`
- **Fix sugerido:** ${finding.fix}
`
  )
  .join("\n")}

## Notas de cobertura

${report.coverageNotes.map((item) => `- ${item}`).join("\n")}

## No validado

${report.notValidated.map((item) => `- ${item}`).join("\n")}

## Reproducir

\`\`\`bash
npm run db:reset
npm run test:validation
\`\`\`
`

  writeFileSync(REPORT_MD, markdown)

  await cleanupClass(TEST_CLASS).catch(() => {})
  await cleanupClass(CONCURRENCY_CLASS).catch(() => {})

  for (const session of sessions.values()) {
    await session.context.close().catch(() => {})
  }
  await closeDb().catch(() => {})
})

test("simulación de un día normal con múltiples usuarios", async ({ browser }) => {
  // ── 06:00 — Apertura: todos los usuarios inician sesión ────────────────
  await runStep(
    "login-multiusuario",
    {
      phase: "06:00 Apertura",
      role: "todos",
      expected: "12 sesiones simultáneas activas",
    },
    null,
    async () => {
      const loginErrors: string[] = []
      for (const [key, email] of Object.entries(USERS) as [UserKey, string][]) {
        try {
          sessions.set(key, await login(browser, email))
        } catch (error) {
          loginErrors.push(`${key} (${email}): ${errorMessage(error)}`)
        }
      }
      if (loginErrors.length > 0) {
        throw new Error(`Fallaron ${loginErrors.length} login(s):\n${loginErrors.join("\n")}`)
      }
      expect(sessions.size).toBe(Object.keys(USERS).length)
    }
  )

  // ── 06:15 — Registro y controles de acceso ─────────────────────────────
  await runStep(
    "registro-nuevo-miembro",
    {
      phase: "06:15 Apertura",
      role: "anónimo",
      expected: "Un visitante crea una cuenta y llega al onboarding",
    },
    null,
    async () => {
      const { context, page } = await openAnonymous(browser, "/register")
      try {
        await page.waitForLoadState("networkidle")
        await page.getByRole("button", { name: /Soy usuario/i }).click()
        await expect(page.locator("#name")).toBeVisible({ timeout: 15_000 })
        await page.locator("#name").fill("Usuario Validación")
        await page.locator("#email").fill(NEW_MEMBER_EMAIL)
        await page.locator("#password").fill("Demo1234")
        await page.locator("#confirmPassword").fill("Demo1234")
        await page.getByRole("button", { name: /^Crear cuenta$/i }).click()
        await page.waitForURL(/\/onboarding/, { timeout: 25_000 })
        await expect(page.getByRole("heading", { name: /¿Cuál es tu objetivo?/i })).toBeVisible({
          timeout: 20_000,
        })
      } finally {
        await context.close()
      }
    }
  )

  await runStep(
    "login-credenciales-invalidas",
    {
      phase: "06:20 Apertura",
      role: "anónimo",
      expected: "Credenciales incorrectas muestran un error claro",
    },
    null,
    async () => {
      const { context, page } = await openAnonymous(browser, "/login")
      try {
        await expect(page.getByRole("button", { name: /Iniciar sesión/i })).toBeVisible({
          timeout: 20_000,
        })
        await page.locator('input[type="email"]').fill("carlos@gymapp.com")
        await page.locator('input[type="password"]').fill("incorrecta")
        await page.getByRole("button", { name: /Iniciar sesión/i }).click()
        await expect(page.getByText("Credenciales inválidas")).toBeVisible({ timeout: 20_000 })
      } finally {
        await context.close()
      }
    }
  )

  await runStep(
    "auth-dashboard-sin-sesion",
    {
      phase: "06:25 Apertura",
      role: "anónimo",
      expected: "El dashboard redirige al login sin sesión",
    },
    null,
    async () => {
      const { context, page } = await openAnonymous(browser, "/dashboard")
      try {
        await page.waitForURL(/\/login/, { timeout: 20_000 })
        await expect(page.getByRole("button", { name: /Iniciar sesión/i })).toBeVisible()
      } finally {
        await context.close()
      }
    }
  )

  await runStep(
    "auth-miembro-no-entra-admin",
    {
      phase: "06:30 Apertura",
      role: "carlos",
      expected: "Un miembro no puede acceder a /admin ni /coach",
    },
    requireSession("carlos").page,
    async () => {
      const carlos = requireSession("carlos")
      await visit(carlos.page, "/admin")
      await expect(carlos.page).not.toHaveURL(/\/admin/, { timeout: 20_000 })
      await visit(carlos.page, "/coach")
      await expect(carlos.page).not.toHaveURL(/\/coach/, { timeout: 20_000 })
    }
  )

  await runStep(
    "auth-trainer-no-entra-admin",
    {
      phase: "06:35 Apertura",
      role: "trainer",
      expected: "Un trainer no puede acceder a /admin",
    },
    requireSession("trainer").page,
    async () => {
      const trainer = requireSession("trainer")
      await visit(trainer.page, "/admin")
      await expect(trainer.page).not.toHaveURL(/\/admin/, { timeout: 20_000 })
    }
  )

  await runStep(
    "auth-idor-membership",
    {
      phase: "06:40 Apertura",
      role: "carlos",
      expected: "Un miembro no puede modificar la membresía de otro usuario",
    },
    requireSession("carlos").page,
    async () => {
      const anaMembership = await getMembership(USERS.ana)
      if (!anaMembership) throw new Error("Ana no tiene membresía para probar el IDOR")

      const response = await requireSession("carlos").page.request.patch(
        `/api/memberships/${anaMembership.id}`,
        { data: { paymentConfirmed: true } }
      )
      if (response.status() !== 403 && response.status() !== 401) {
        throw new Error(
          `PATCH de una membresía ajena devolvió ${response.status()}; se esperaba 403/401 (IDOR)`
        )
      }
    }
  )

  // ── 07:00 — Admin abre el gimnasio ─────────────────────────────────────
  const admin = requireSession("admin")
  await runStep(
    "admin-dashboard",
    {
      phase: "07:00 Mañana",
      role: "admin",
      expected: "Dashboard con métricas y accesos de administración",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/dashboard")
      await expect(admin.page.locator("h1")).toContainText(
        /Fitness Total|Panel de Administración/,
        { timeout: 20_000 }
      )
      await expect(admin.page.getByText("Membresías activas")).toBeVisible()
      await expect(admin.page.getByRole("link", { name: /Membresías/i })).toBeVisible()
    }
  )

  await runStep(
    "admin-pagos-pendientes",
    {
      phase: "07:15 Mañana",
      role: "admin",
      expected: "Lista de pagos pendientes con el comprobante de Mateo",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/coach/payments")
      await expect(admin.page.getByRole("heading", { name: /Pagos pendientes/i })).toBeVisible({
        timeout: 20_000,
      })
      await expect(admin.page.getByText("Mateo Herrera")).toBeVisible()
      await expect(
        admin.page.getByRole("button", { name: /Confirmar pago/i }).first()
      ).toBeVisible()
    }
  )

  await runStep(
    "admin-membresias",
    {
      phase: "07:30 Mañana",
      role: "admin",
      expected: "Panel de membresías con miembros y estados",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/admin/memberships")
      await expect(admin.page.getByRole("heading", { name: /^Membresías$/i })).toBeVisible({
        timeout: 20_000,
      })
      await admin.page.getByRole("tab", { name: /Activas/i }).click()
      await expect(admin.page.getByText("Carlos Rodríguez")).toBeVisible({ timeout: 20_000 })
      await admin.page.getByRole("tab", { name: /Vencidas/i }).click()
      await expect(admin.page.getByText("Sofía Castillo")).toBeVisible({ timeout: 20_000 })
    }
  )

  await runStep(
    "admin-gestion-gimnasio",
    {
      phase: "07:45 Mañana",
      role: "admin",
      expected: "Gestión de ejercicios, rutinas y equipamiento",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/admin/gym-management")
      await expect(admin.page.getByRole("heading", { name: /Gestión del Gimnasio/i })).toBeVisible({
        timeout: 20_000,
      })
      await expect(admin.page.getByRole("tab", { name: /Ejercicios/i })).toBeVisible()
    }
  )

  await runStep(
    "admin-crea-y-elimina-ejercicio",
    {
      phase: "07:50 Mañana",
      role: "admin",
      expected: "Crear un ejercicio y luego eliminarlo",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/admin/gym-management")
      await admin.page.getByRole("button", { name: /Nuevo ejercicio/i }).click()
      await expect(admin.page.locator("#ex-name")).toBeVisible({ timeout: 15_000 })
      await admin.page.locator("#ex-name").fill(TEST_EXERCISE)
      await admin.page.locator("#ex-category").fill("Validación")
      await admin.page.getByRole("button", { name: /Crear ejercicio/i }).click()
      await toast(admin.page, /Ejercicio creado/i)
      await expect(admin.page.getByText(TEST_EXERCISE).first()).toBeVisible({ timeout: 20_000 })

      const row = admin.page
        .locator("div.flex.items-center.gap-4.p-4")
        .filter({ hasText: TEST_EXERCISE })
        .first()
      await expect(row).toBeVisible({ timeout: 15_000 })
      await row.locator("button.text-destructive").click()
      await admin.page.getByRole("button", { name: /^Eliminar$/i }).click()
      await toast(admin.page, /Ejercicio eliminado/i)
      await expect(admin.page.getByText(TEST_EXERCISE)).toHaveCount(0, { timeout: 20_000 })
    }
  )

  await runStep(
    "admin-crea-y-elimina-equipo",
    {
      phase: "07:55 Mañana",
      role: "admin",
      expected: "Crear un equipo y luego eliminarlo",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/admin/gym-management")
      await admin.page.getByRole("tab", { name: /Equipamiento/i }).click()
      await admin.page
        .getByRole("button", { name: /Agregar equipo/i })
        .first()
        .click()
      await expect(admin.page.locator("#equipName")).toBeVisible({ timeout: 15_000 })
      await admin.page.locator("#equipName").fill(TEST_EQUIPMENT)
      await admin.page.locator("#equipLocation").fill("Zona de validación")
      await admin.page.getByRole("button", { name: /^Guardar$/i }).click()
      await toast(admin.page, /Equipo agregado/i)
      await expect(admin.page.getByText(TEST_EQUIPMENT).first()).toBeVisible({ timeout: 20_000 })

      const card = admin.page
        .locator('[data-slot="card"]')
        .filter({ hasText: TEST_EQUIPMENT })
        .first()
      await card.getByRole("button", { name: /Eliminar equipo/i }).click()
      await admin.page.getByRole("button", { name: /^Eliminar$/i }).click()
      await toast(admin.page, /Equipo eliminado/i)
    }
  )

  // ── 08:00 — Coach revisa clientes y asigna una rutina ──────────────────
  const trainer = requireSession("trainer")
  await runStep(
    "coach-panel",
    {
      phase: "08:00 Mañana",
      role: "trainer",
      expected: "Panel de Coach con clientes, rutinas y clases",
    },
    trainer.page,
    async () => {
      await visit(trainer.page, "/dashboard")
      await expect(trainer.page.getByRole("heading", { name: /Panel de Coach/i })).toBeVisible({
        timeout: 20_000,
      })
      await expect(trainer.page.getByText("Mis clientes").first()).toBeVisible()
    }
  )

  await runStep(
    "coach-clientes",
    {
      phase: "08:15 Mañana",
      role: "trainer",
      expected: "Listado de clientes asignados",
    },
    trainer.page,
    async () => {
      await visit(trainer.page, "/coach/clients")
      await expect(trainer.page.getByRole("heading", { name: /Mis clientes/i })).toBeVisible({
        timeout: 20_000,
      })
      await expect(trainer.page.getByText("Carlos Rodríguez")).toBeVisible()
    }
  )

  await runStep(
    "coach-crea-rutina",
    {
      phase: "08:20 Mañana",
      role: "trainer",
      expected: "El coach crea una rutina nueva con un ejercicio",
    },
    trainer.page,
    async () => {
      await visit(trainer.page, "/routines/new")
      await expect(trainer.page.getByRole("heading", { name: /Nueva rutina/i })).toBeVisible({
        timeout: 20_000,
      })
      await trainer.page.locator("#name").fill(TEST_ROUTINE)
      await trainer.page.locator("#desc").fill("Rutina creada por la validación automática")
      await trainer.page
        .getByPlaceholder(/Buscar por nombre o grupo muscular/i)
        .fill("Press de banca")
      await trainer.page
        .getByRole("button")
        .filter({ hasText: /Press de banca/i })
        .first()
        .click()
      await trainer.page.getByRole("button", { name: /Crear rutina/i }).click()
      await toast(trainer.page, /Rutina creada/i)
      await trainer.page.waitForURL(/\/routines/, { timeout: 20_000 })
      await expect(trainer.page.getByText(TEST_ROUTINE).first()).toBeVisible({
        timeout: 20_000,
      })
    }
  )

  await runStep(
    "coach-crea-cliente",
    {
      phase: "08:25 Mañana",
      role: "trainer",
      expected: "El coach registra un cliente nuevo desde el dashboard",
    },
    trainer.page,
    async () => {
      const before = await countUsers()
      await visit(trainer.page, "/dashboard")
      await trainer.page.getByRole("button", { name: /Nuevo cliente/i }).click()
      await expect(trainer.page.getByRole("dialog").getByText(/Nuevo cliente/i)).toBeVisible({
        timeout: 10_000,
      })
      await expect(trainer.page.locator("#invName")).toBeVisible({ timeout: 15_000 })
      await trainer.page.locator("#invName").fill("Cliente Validación")
      await trainer.page.locator("#invEmail").fill(NEW_CLIENT_EMAIL)
      await trainer.page.locator("#invPassword").fill("Demo1234")
      await trainer.page.getByRole("button", { name: /Crear miembro/i }).click()
      await expect(trainer.page.getByText(/creado como tu cliente/i)).toBeVisible({
        timeout: 20_000,
      })
      const after = await countUsers()
      expect(after).toBe(before + 1)
      await trainer.page.getByRole("button", { name: /^Cerrar$/i }).click()
    }
  )

  await runStep(
    "coach-crea-invitacion",
    {
      phase: "08:30 Mañana",
      role: "trainer",
      expected: "El coach genera un link de invitación y el invitado lo abre",
    },
    trainer.page,
    async () => {
      await visit(trainer.page, "/dashboard")
      await trainer.page.getByRole("button", { name: /Nuevo cliente/i }).click()
      await trainer.page.getByRole("button", { name: /Enviar link/i }).click()
      await expect(trainer.page.locator("#invName")).toBeVisible({ timeout: 15_000 })
      await trainer.page.locator("#invName").fill("Invitado Validación")
      await trainer.page.locator("#invEmail").fill(NEW_INVITE_EMAIL)
      await trainer.page.getByRole("button", { name: /Crear link/i }).click()
      await expect(trainer.page.getByText(/Link de invitación/i).first()).toBeVisible({
        timeout: 20_000,
      })
      const rawInviteUrl = (await trainer.page.locator("p.break-all").first().textContent()) ?? ""
      const tokenMatch = rawInviteUrl.match(/\/invite\/([A-Za-z0-9_-]+)/)
      if (!tokenMatch) throw new Error(`No se pudo extraer el token de invitación: ${rawInviteUrl}`)
      const token = tokenMatch[1]

      const { context, page } = await openAnonymous(browser, `/invite/${token}`)
      try {
        await expect(page.getByText("Únete como cliente", { exact: true })).toBeVisible({
          timeout: 60_000,
        })
        await expect(page.getByText(/Coach Martínez/i).first()).toBeVisible({ timeout: 30_000 })

        await expireInvite(token)
        await page.reload({ waitUntil: "domcontentloaded" })
        await expect(page.getByText(/Invitación no disponible/i)).toBeVisible({
          timeout: 20_000,
        })
      } finally {
        await context.close()
      }
      await trainer.page.getByRole("button", { name: /^Cerrar$/i }).click()
    }
  )

  await runStep(
    "coach-crea-clase",
    {
      phase: "08:35 Mañana",
      role: "trainer",
      expected: "El coach crea una clase con capacidad 1",
    },
    trainer.page,
    async () => {
      await visit(trainer.page, "/dashboard")
      await trainer.page.getByRole("button", { name: /Nueva clase/i }).click()
      await expect(trainer.page.getByRole("dialog").getByText(/Nueva clase/i)).toBeVisible({
        timeout: 10_000,
      })
      await expect(trainer.page.locator("#className")).toBeVisible({ timeout: 15_000 })
      await trainer.page.locator("#className").fill(TEST_CLASS)
      await trainer.page.locator("#classDescription").fill("Clase de validación automática")
      await trainer.page.getByRole("dialog").getByRole("combobox").first().click()
      await trainer.page.getByRole("option", { name: /Viernes/i }).click()
      await trainer.page.locator("#classStartTime").fill("19:00")
      await trainer.page.locator("#classCapacity").fill("1")
      await trainer.page.getByRole("button", { name: /Crear clase/i }).click()
      await toast(trainer.page, /Clase creada/i)
      await expect(trainer.page.getByText(TEST_CLASS).first()).toBeVisible({ timeout: 20_000 })
    }
  )

  await runStep(
    "clase-capacidad-y-cancelacion",
    {
      phase: "08:40 Mañana",
      role: "carlos/ana",
      expected: "Carlos reserva, Ana ve clase llena, Carlos cancela y Ana reserva",
    },
    requireSession("carlos").page,
    async () => {
      const carlos = requireSession("carlos")
      const ana = requireSession("ana")

      await visit(carlos.page, "/classes")
      const carlosCard = carlos.page
        .getByText(TEST_CLASS, { exact: true })
        .locator("xpath=ancestor::div[@data-slot='card']")
        .first()
      await expect(carlosCard).toBeVisible({ timeout: 20_000 })
      await carlosCard.getByRole("button", { name: /Reservar lugar/i }).click()
      await expect
        .poll(() => hasBookingForClass(USERS.carlos, TEST_CLASS), { timeout: 15_000 })
        .toBe(true)

      await visit(ana.page, "/classes")
      const anaCard = ana.page
        .getByText(TEST_CLASS, { exact: true })
        .locator("xpath=ancestor::div[@data-slot='card']")
        .first()
      await expect(anaCard.getByRole("button", { name: /Clase llena/i })).toBeDisabled({
        timeout: 20_000,
      })

      await visit(carlos.page, "/classes")
      const carlosCard2 = carlos.page
        .getByText(TEST_CLASS, { exact: true })
        .locator("xpath=ancestor::div[@data-slot='card']")
        .first()
      await carlosCard2.getByRole("button", { name: /Cancelar reserva/i }).click()
      await expect
        .poll(() => hasBookingForClass(USERS.carlos, TEST_CLASS), { timeout: 15_000 })
        .toBe(false)

      await visit(carlos.page, "/classes")
      const carlosCard3 = carlos.page
        .getByText(TEST_CLASS, { exact: true })
        .locator("xpath=ancestor::div[@data-slot='card']")
        .first()
      await expect(carlosCard3.getByRole("button", { name: /Reservar lugar/i })).toBeVisible({
        timeout: 15_000,
      })

      await visit(ana.page, "/classes")
      const anaCard2 = ana.page
        .getByText(TEST_CLASS, { exact: true })
        .locator("xpath=ancestor::div[@data-slot='card']")
        .first()
      await anaCard2.getByRole("button", { name: /Reservar lugar/i }).click()
      await expect
        .poll(() => hasBookingForClass(USERS.ana, TEST_CLASS), { timeout: 15_000 })
        .toBe(true)

      await visit(ana.page, "/classes")
      const anaCard3 = ana.page
        .getByText(TEST_CLASS, { exact: true })
        .locator("xpath=ancestor::div[@data-slot='card']")
        .first()
      await anaCard3.getByRole("button", { name: /Cancelar reserva/i }).click()
      await expect
        .poll(() => hasBookingForClass(USERS.ana, TEST_CLASS), { timeout: 15_000 })
        .toBe(false)
    }
  )

  await runStep(
    "clase-concurrencia",
    {
      phase: "08:45 Mañana",
      role: "carlos/ana",
      expected: "Con capacidad 1, solo una de dos reservas simultáneas debe ganar",
    },
    requireSession("carlos").page,
    async () => {
      const trainer = requireSession("trainer")
      const created = await trainer.page.request.post("/api/classes", {
        data: {
          name: CONCURRENCY_CLASS,
          capacity: 1,
          duration: 30,
          dayOfWeek: "FRIDAY",
          startTime: "20:00",
        },
      })
      expect(created.status()).toBe(201)
      const createdBody = (await created.json()) as { class: { id: string } }
      const classId = createdBody.class.id

      const carlos = requireSession("carlos")
      const ana = requireSession("ana")
      const [first, second] = await Promise.all([
        carlos.page.request.post("/api/bookings", { data: { classId } }),
        ana.page.request.post("/api/bookings", { data: { classId } }),
      ])
      const statuses = [first.status(), second.status()].sort((a, b) => a - b)
      if (statuses[0] !== 201 || statuses[1] !== 409) {
        throw new Error(
          `Dos reservas concurrentes con capacidad 1 devolvieron ${statuses.join(" y ")}; se esperaba 201 y 409 (overbooking)`
        )
      }

      const confirmed = await getClassBookingCount(CONCURRENCY_CLASS)
      expect(confirmed).toBeLessThanOrEqual(1)
    }
  )

  await runStep(
    "coach-asignar-rutina",
    {
      phase: "08:30 Mañana",
      role: "trainer",
      expected: "Asignar una rutina a Carlos desde su ficha",
    },
    trainer.page,
    async () => {
      await visit(trainer.page, "/coach/clients")
      await trainer.page.getByText("Carlos Rodríguez").first().click()
      await trainer.page.waitForURL(/\/coach\/clients\/[^/]+$/, { timeout: 20_000 })

      const assign = trainer.page.getByRole("button", {
        name: /Asignar rutina|Cambiar/i,
      })
      await expect(assign.first()).toBeVisible({ timeout: 20_000 })
      await assign.first().click()

      const routine = trainer.page.getByRole("button", {
        name: /Definición 4x por Semana|Fuerza 5x5 Modificada/i,
      })
      await expect(routine.first()).toBeVisible({ timeout: 20_000 })
      await routine.first().click()
      await toast(trainer.page, /Rutina asignada|Rutina cambiada/i)
    }
  )

  await runStep(
    "member-ve-rutina-asignada",
    {
      phase: "08:45 Mañana",
      role: "carlos",
      expected: "Carlos ve la rutina recién asignada por su coach",
    },
    requireSession("carlos").page,
    async () => {
      const carlos = requireSession("carlos")
      await visit(carlos.page, "/rutinas")
      await expect(carlos.page.getByText(/Hola,/i)).toBeVisible({ timeout: 20_000 })
      await expect(
        carlos.page.getByText(/Definición 4x por Semana|Fuerza 5x5 Modificada/i)
      ).toBeVisible({ timeout: 20_000 })
    }
  )

  const trainer2 = requireSession("trainer2")
  const roberto = requireSession("roberto")

  await runStep(
    "trainer2-solicita-roberto",
    {
      phase: "09:30 Mañana",
      role: "trainer2",
      expected: "Trainer2 envía una solicitud de coaching a Roberto",
    },
    trainer2.page,
    async () => {
      await visit(trainer2.page, "/dashboard")
      const search = trainer2.page.getByPlaceholder(/Buscar miembro por nombre o email/i)
      await expect(search).toBeVisible({ timeout: 20_000 })
      await search.fill("roberto")
      await expect(trainer2.page.getByText("Roberto Navarro")).toBeVisible({ timeout: 15_000 })
      await trainer2.page
        .getByRole("button", { name: /Enviar solicitud/i })
        .first()
        .click()
      await expect(trainer2.page.getByText("Solicitud enviada correctamente")).toBeVisible({
        timeout: 15_000,
      })
    }
  )

  await runStep(
    "roberto-acepta-solicitud",
    {
      phase: "09:45 Mañana",
      role: "roberto",
      expected: "Roberto recibe y acepta la solicitud desde notificaciones",
    },
    roberto.page,
    async () => {
      await visit(roberto.page, "/dashboard")
      await expect(roberto.page.getByLabel("Notificaciones")).toBeVisible({ timeout: 20_000 })
      await roberto.page.getByLabel("Notificaciones").click()
      await roberto.page.getByText("Solicitud de entrenador").first().click()
      const accept = roberto.page.getByRole("button", { name: /^Aceptar$/i })
      await expect(accept).toBeVisible({ timeout: 15_000 })
      await accept.click()
      await expect(roberto.page.getByText(/Entrenador aceptado/i).first()).toBeVisible({
        timeout: 15_000,
      })
    }
  )

  await runStep(
    "trainer2-ve-roberto",
    {
      phase: "10:00 Mañana",
      role: "trainer2",
      expected: "Roberto aparece como cliente de Trainer2 tras aceptar",
    },
    trainer2.page,
    async () => {
      await visit(trainer2.page, "/coach/clients")
      await expect(trainer2.page.getByText("Roberto Navarro")).toBeVisible({ timeout: 20_000 })
    }
  )

  // ── 09:00 — Laura empieza su onboarding ────────────────────────────────
  const laura = requireSession("laura")
  await runStep(
    "onboarding-inicio",
    {
      phase: "10:15 Mañana",
      role: "laura",
      expected: "Onboarding inicia en el paso de objetivo",
    },
    laura.page,
    async () => {
      await visit(laura.page, "/onboarding")
      await expect(laura.page.getByRole("heading", { name: /¿Cuál es tu objetivo?/i })).toBeVisible(
        { timeout: 20_000 }
      )
    }
  )

  await runStep(
    "onboarding-primeros-pasos",
    {
      phase: "10:30 Mañana",
      role: "laura",
      expected: "Avanzar objetivo, historial, nivel y frecuencia hasta condiciones físicas",
      notes: "Parcial: no se completa el onboarding para no generar una rutina nueva",
    },
    laura.page,
    async () => {
      await laura.page.getByRole("button", { name: /Ganar masa muscular/i }).click()
      await expect(
        laura.page.getByRole("heading", { name: /Historial de entrenamiento/i })
      ).toBeVisible({ timeout: 10_000 })

      await laura.page.getByRole("button", { name: /2 a 3 veces por semana/i }).click()
      await expect(laura.page.getByRole("heading", { name: /Nivel de experiencia/i })).toBeVisible({
        timeout: 10_000,
      })

      await laura.page.getByRole("button", { name: /Principiante/i }).click()
      await expect(
        laura.page.getByRole("heading", { name: /Frecuencia de entrenamiento/i })
      ).toBeVisible({ timeout: 10_000 })

      await laura.page.getByRole("button", { name: /3 días por semana/i }).click()
      await expect(laura.page.getByRole("heading", { name: /Condiciones físicas/i })).toBeVisible({
        timeout: 10_000,
      })
    }
  )

  await runStep(
    "onboarding-completo",
    {
      phase: "10:45 Mañana",
      role: "laura",
      expected: "Completar peso, altura, medidas, horario, confirmación y elegir rutina",
    },
    laura.page,
    async () => {
      await laura.page.getByRole("button", { name: /^No poseo$/i }).click()
      await laura.page.getByRole("button", { name: /^Continuar$/i }).click()
      await expect(laura.page.getByRole("heading", { name: /Peso y altura/i })).toBeVisible({
        timeout: 10_000,
      })

      const numericInputs = laura.page.locator('input[inputMode="decimal"]')
      await numericInputs.nth(0).fill("70")
      await numericInputs.nth(1).fill("175")
      await laura.page.getByRole("button", { name: /^Continuar$/i }).click()
      await expect(laura.page.getByRole("heading", { name: /Medidas corporales/i })).toBeVisible({
        timeout: 10_000,
      })

      await laura.page.getByRole("button", { name: /^Continuar$/i }).click()
      await expect(laura.page.getByRole("heading", { name: /Horario/i })).toBeVisible({
        timeout: 10_000,
      })

      await laura.page.getByRole("button", { name: /Mañana/i }).click()
      await expect(laura.page.getByRole("heading", { name: /Confirma tus datos/i })).toBeVisible({
        timeout: 10_000,
      })

      await laura.page.getByRole("button", { name: /Confirmar y generar rutina/i }).click()
      await expect(
        laura.page.getByRole("heading", { name: /Tu rutina personalizada/i })
      ).toBeVisible({ timeout: 45_000 })

      const planCard = laura.page
        .getByRole("button")
        .filter({ hasText: /ejercicios/i })
        .first()
      try {
        await expect(planCard).toBeVisible({ timeout: 20_000 })
      } catch {
        throw new Error(
          "No se generaron planes de rutina: /api/fitness-coach devolvió 500 por una violación de unicidad en Exercise.name (ver F-08)"
        )
      }
      await planCard.dblclick()

      await laura.page.waitForURL(/\/dashboard/, { timeout: 30_000 })
      await visit(laura.page, "/rutinas")
      await expect(laura.page.getByText(/Hola,/i)).toBeVisible({ timeout: 20_000 })
      await expect(laura.page.getByText(/Mis entrenamientos/i)).toBeVisible({ timeout: 20_000 })
    }
  )

  // ── 11:00 — Entrenamientos ─────────────────────────────────────────────
  const carlos = requireSession("carlos")
  let carlosPlanId = ""
  await runStep(
    "workout-carlos",
    {
      phase: "11:00 Mediodía",
      role: "carlos",
      expected: "Completar un entrenamiento, persistirlo y volver a la lista de rutinas",
    },
    carlos.page,
    async () => {
      const before = await countWorkouts(USERS.carlos)
      carlosPlanId = await completeWorkout(carlos.page)
      expect(carlosPlanId).not.toBe("")
      const after = await countWorkouts(USERS.carlos)
      expect(after).toBe(before + 1)
      await expect(carlos.page.getByText(/Progreso semanal/i).first()).toBeVisible({
        timeout: 20_000,
      })
    }
  )

  await runStep(
    "workout-historial",
    {
      phase: "11:15 Mediodía",
      role: "carlos",
      expected: "El historial del plan carga (actualmente es un placeholder)",
    },
    carlos.page,
    async () => {
      await visit(carlos.page, `/rutinas/${carlosPlanId}/historial`)
      await expect(
        carlos.page.getByRole("heading", { name: /Historial de entrenamientos/i })
      ).toBeVisible({ timeout: 20_000 })
      await expect(carlos.page.getByText(/en construcción/i)).toBeVisible({ timeout: 20_000 })
    }
  )

  await runStep(
    "progress-carlos",
    {
      phase: "11:30 Mediodía",
      role: "carlos",
      expected: "Página de progreso con historial de mediciones",
    },
    carlos.page,
    async () => {
      await visit(carlos.page, "/progress")
      await expect(carlos.page.getByRole("heading", { name: /^Progreso$/i })).toBeVisible({
        timeout: 20_000,
      })
      await carlos.page.getByRole("tab", { name: /Historial/i }).click()
      await expect(carlos.page.getByText("Historial de mediciones")).toBeVisible({
        timeout: 20_000,
      })
    }
  )

  const mateo = requireSession("mateo")
  await runStep(
    "routine-mateo",
    {
      phase: "11:45 Mediodía",
      role: "mateo",
      expected: "Miembro con plan activo ve sus entrenamientos",
    },
    mateo.page,
    async () => {
      await visit(mateo.page, "/rutinas")
      await expect(mateo.page.getByText(/Hola,/i)).toBeVisible({ timeout: 20_000 })
      await expect(mateo.page.getByText(/Mis entrenamientos/i)).toBeVisible()
    }
  )

  const ana = requireSession("ana")
  await runStep(
    "progress-ana",
    {
      phase: "12:00 Mediodía",
      role: "ana",
      expected: "Miembro activa ve su progreso e historial",
    },
    ana.page,
    async () => {
      await visit(ana.page, "/progress")
      await expect(ana.page.getByRole("heading", { name: /^Progreso$/i })).toBeVisible({
        timeout: 20_000,
      })
      await ana.page.getByRole("tab", { name: /Historial/i }).click()
      await expect(ana.page.getByText("Historial de mediciones")).toBeVisible({
        timeout: 20_000,
      })
    }
  )

  // ── 12:15 — Perfil, preferencias, medidas y timer ──────────────────────
  await runStep(
    "profile-actualiza-datos",
    {
      phase: "12:15 Mediodía",
      role: "carlos",
      expected: "Carlos actualiza nombre y teléfono",
    },
    carlos.page,
    async () => {
      await visit(carlos.page, "/profile")
      await carlos.page.locator("#profileName").fill("Carlos Rodríguez")
      await carlos.page.locator("#profilePhone").fill("+52 555 123 4567")
      await carlos.page.getByRole("button", { name: /Guardar cambios/i }).click()
      await toast(carlos.page, /Perfil actualizado/i)
      const user = await findUser(USERS.carlos)
      expect(user.phone).toBe("+52 555 123 4567")
    }
  )

  await runStep(
    "profile-avatar",
    {
      phase: "12:20 Mediodía",
      role: "carlos",
      expected: "Carlos sube una foto de perfil",
    },
    carlos.page,
    async () => {
      await visit(carlos.page, "/profile")
      await carlos.page.locator('input[type="file"]').first().setInputFiles({
        name: "avatar.png",
        mimeType: "image/png",
        buffer: TINY_PNG,
      })
      await toast(carlos.page, /Foto de perfil actualizada/i)
    }
  )

  await runStep(
    "settings-tema-y-sonido",
    {
      phase: "12:25 Mediodía",
      role: "carlos",
      expected: "Cambiar tema a oscuro/claro y alternar sonidos",
    },
    carlos.page,
    async () => {
      await visit(carlos.page, "/profile/settings")
      await expect(carlos.page.getByRole("heading", { name: /Configuración/i })).toBeVisible({
        timeout: 20_000,
      })

      await carlos.page.getByRole("button", { name: /Oscuro/i }).click()
      await expect(carlos.page.locator("html")).toHaveClass(/dark/, { timeout: 10_000 })
      await carlos.page.getByRole("button", { name: /Claro/i }).click()
      await expect(carlos.page.locator("html")).not.toHaveClass(/dark/, { timeout: 10_000 })

      const soundToggle = carlos.page.getByRole("button", { name: /Efectos de sonido/i })
      const before = (await soundToggle.textContent()) ?? ""
      await soundToggle.click()
      await expect(soundToggle).not.toHaveText(before, { timeout: 10_000 })
    }
  )

  await runStep(
    "progress-nueva-medicion",
    {
      phase: "12:30 Mediodía",
      role: "carlos",
      expected: "Registrar una nueva medición corporal",
    },
    carlos.page,
    async () => {
      const before = await countMeasurements(USERS.carlos)
      await visit(carlos.page, "/progress")
      await carlos.page.getByRole("button", { name: /Nueva medición/i }).click()
      await carlos.page.locator("#weight").fill("84.6")
      await carlos.page.getByRole("button", { name: /^Guardar$/i }).click()
      await toast(carlos.page, /Medición guardada/i)
      const after = await countMeasurements(USERS.carlos)
      expect(after).toBe(before + 1)
    }
  )

  await runStep(
    "timer-funciona",
    {
      phase: "12:35 Mediodía",
      role: "carlos",
      expected: "El temporizador inicia, cuenta y pausa",
    },
    carlos.page,
    async () => {
      await visit(carlos.page, "/timer")
      await expect(carlos.page.getByRole("heading", { name: /Temporizador/i })).toBeVisible({
        timeout: 20_000,
      })
      await carlos.page.getByRole("button", { name: /^30s$/i }).click()
      await carlos.page.getByRole("button", { name: /^Iniciar$/i }).click()
      await expect(carlos.page.getByRole("button", { name: /^Pausar$/i })).toBeVisible({
        timeout: 10_000,
      })
      await carlos.page.waitForTimeout(2200)
      await carlos.page.getByRole("button", { name: /^Pausar$/i }).click()
      await expect(carlos.page.getByRole("button", { name: /^Iniciar$/i })).toBeVisible({
        timeout: 10_000,
      })
      await visit(carlos.page, "/rutinas")
    }
  )

  // ── 12:45 — Super Admin, redirects y 404 ───────────────────────────────
  const superadmin = requireSession("superadmin")
  await runStep(
    "superadmin-dashboard",
    {
      phase: "12:45 Mediodía",
      role: "superadmin",
      expected: "Super Admin entra al dashboard sin errores",
    },
    superadmin.page,
    async () => {
      await visit(superadmin.page, "/super-admin")
      await superadmin.page.waitForURL(/\/dashboard/, { timeout: 20_000 })
      await expect(superadmin.page.locator("h1")).toContainText(
        /Fitness Total|Panel de Plataforma|Panel/i,
        { timeout: 20_000 }
      )
    }
  )

  await runStep(
    "requests-redirect",
    {
      phase: "12:50 Mediodía",
      role: "superadmin",
      expected: "/requests redirige al dashboard",
    },
    superadmin.page,
    async () => {
      await visit(superadmin.page, "/requests")
      await superadmin.page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    }
  )

  await runStep(
    "error-404",
    {
      phase: "12:55 Mediodía",
      role: "carlos",
      expected: "Una ruta inexistente devuelve 404",
    },
    carlos.page,
    async () => {
      const response = await carlos.page.goto("/ruta-inexistente", {
        waitUntil: "domcontentloaded",
      })
      expect(response?.status()).toBe(404)
      await expect(carlos.page.getByText(/404|not found|no encontrada/i).first()).toBeVisible({
        timeout: 10_000,
      })
    }
  )

  await runStep(
    "responsive-mobile",
    {
      phase: "13:00 Tarde",
      role: "carlos",
      expected: "Mi Rutina usable en viewport móvil sin overflow horizontal",
    },
    carlos.page,
    async () => {
      await carlos.page.setViewportSize({ width: 390, height: 844 })
      await visit(carlos.page, "/rutinas")
      await expect(carlos.page.getByText(/Hola,/i)).toBeVisible({ timeout: 20_000 })
      await expect(carlos.page.getByText(/Mi Rutina/i).first()).toBeVisible()
      const overflow = await carlos.page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      )
      expect(overflow).toBe(false)
      await carlos.page.setViewportSize({ width: 1280, height: 900 })
    }
  )

  // ── 13:00 — Pago pendiente: admin confirma, Mateo recibe SSE ───────────
  await runStep(
    "mateo-dashboard-pre-pago",
    {
      phase: "13:00 Tarde",
      role: "mateo",
      expected: "Mateo tiene el dashboard abierto antes de la confirmación",
    },
    mateo.page,
    async () => {
      await visit(mateo.page, "/dashboard")
      await expect(mateo.page.getByLabel("Notificaciones")).toBeVisible({ timeout: 20_000 })
      await mateo.page.waitForTimeout(2000)
    }
  )

  await runStep(
    "admin-confirma-pago",
    {
      phase: "13:15 Tarde",
      role: "admin",
      expected: "Confirmar el pago pendiente de Mateo",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/coach/payments")
      await expect(admin.page.getByText("Mateo Herrera")).toBeVisible({ timeout: 20_000 })
      await admin.page
        .getByRole("button", { name: /Confirmar pago/i })
        .first()
        .click()
      await toast(admin.page, /Pago confirmado/i)

      await visit(admin.page, "/coach/payments")
      await expect(admin.page.getByText("No hay pagos pendientes")).toBeVisible({
        timeout: 20_000,
      })
    }
  )

  await runStep(
    "mateo-notificacion-sse",
    {
      phase: "13:30 Tarde",
      role: "mateo",
      expected: "El badge de notificaciones de Mateo se actualiza sin recargar",
    },
    mateo.page,
    async () => {
      const badge = mateo.page.getByLabel("Notificaciones").locator("span").first()
      await expect(badge).toBeVisible({ timeout: 15_000 })
      await mateo.page.getByLabel("Notificaciones").click()
      await expect(mateo.page.getByText("Pago confirmado").first()).toBeVisible({
        timeout: 15_000,
      })
    }
  )

  // ── 14:00 — Membresía con comprobante y revisión del admin ─────────────
  const valentina = requireSession("valentina")
  await runStep(
    "valentina-membresia-pendiente",
    {
      phase: "14:00 Tarde",
      role: "valentina",
      expected: "Valentina tiene una membresía esperando comprobante",
    },
    valentina.page,
    async () => {
      await createPendingMembership(USERS.valentina)
      const membership = await getMembership(USERS.valentina)
      expect(membership?.paymentConfirmed).toBe(false)
      await visit(valentina.page, "/membresia")
      await expect(valentina.page.getByText(/Mi Membresía/i)).toBeVisible({ timeout: 20_000 })
      await expect(valentina.page.getByText(/Confirmar pago/i).first()).toBeVisible({
        timeout: 20_000,
      })
    }
  )

  await runStep(
    "valentina-sube-comprobante",
    {
      phase: "14:10 Tarde",
      role: "valentina",
      expected: "El comprobante queda pendiente de revisión y NO activa la membresía",
    },
    valentina.page,
    async () => {
      await valentina.page.locator('input[type="file"]').first().setInputFiles({
        name: "comprobante.png",
        mimeType: "image/png",
        buffer: TINY_PNG,
      })
      await valentina.page.getByRole("button", { name: /Confirmar pago/i }).click()
      await toast(valentina.page, /Comprobante enviado/i)

      const membership = await getMembership(USERS.valentina)
      if (membership?.paymentConfirmed !== false) {
        throw new Error(
          `El comprobante activó la membresía (paymentConfirmed=${membership?.paymentConfirmed}) sin revisión del admin`
        )
      }
    }
  )

  await runStep(
    "admin-rechaza-pago-valentina",
    {
      phase: "14:20 Tarde",
      role: "admin",
      expected: "Rechazar el comprobante deja el pago FAILED y la membresía sin confirmar",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/coach/payments")
      const card = admin.page
        .locator('[data-slot="card"]')
        .filter({ hasText: "Valentina Ríos" })
        .first()
      await expect(card).toBeVisible({ timeout: 20_000 })
      await card.getByRole("button", { name: /Rechazar/i }).click()
      await toast(admin.page, /Pago rechazado/i)

      const payment = await getLatestPayment(USERS.valentina)
      const membership = await getMembership(USERS.valentina)
      if (payment?.status !== "FAILED") {
        throw new Error(`El pago no quedó FAILED: ${payment?.status}`)
      }
      if (membership?.paymentConfirmed !== false) {
        throw new Error(
          `El pago quedó ${payment.status} pero la membresía sigue confirmada (paymentConfirmed=${membership?.paymentConfirmed})`
        )
      }
    }
  )

  await runStep(
    "valentina-historial-pagos",
    {
      phase: "14:30 Tarde",
      role: "valentina",
      expected: "Valentina ve su historial de pagos",
    },
    valentina.page,
    async () => {
      await visit(valentina.page, "/profile/payments")
      await expect(valentina.page.getByRole("heading", { name: /^Pagos$/i })).toBeVisible({
        timeout: 20_000,
      })
    }
  )

  // ── 15:00 — Membresía vencida → renovación → reserva ───────────────────
  const sofia = requireSession("sofia")
  await runStep(
    "sofia-membresia-vencida",
    {
      phase: "15:00 Tarde",
      role: "sofia",
      expected: "Miembro con membresía vencida no puede reservar clase",
    },
    sofia.page,
    async () => {
      await expireMembership(USERS.sofia)
      await visit(sofia.page, "/classes")
      await expect(sofia.page.getByRole("heading", { name: /^Clases$/i })).toBeVisible({
        timeout: 20_000,
      })
      await sofia.page
        .getByRole("button", { name: /Reservar lugar/i })
        .first()
        .click()
      await toast(sofia.page, /Necesitas una membresía activa/i)
    }
  )

  await runStep(
    "sofia-renovacion-y-reserva",
    {
      phase: "15:30 Tarde",
      role: "sofia",
      expected: "Tras renovar +30 días, la reserva de clase funciona",
      notes: "Time travel: endDate pasa de ayer a +30 días en la BD",
    },
    sofia.page,
    async () => {
      await renewMembership(USERS.sofia, 30)
      await visit(sofia.page, "/classes")
      await sofia.page
        .getByRole("button", { name: /Reservar lugar/i })
        .first()
        .click()
      await toast(sofia.page, /Clase reservada/i)
    }
  )

  const ricardo = requireSession("ricardo")
  await runStep(
    "ricardo-membresia-inactiva",
    {
      phase: "16:00 Tarde",
      role: "ricardo",
      expected: "Miembro inactivo no puede reservar clase",
    },
    ricardo.page,
    async () => {
      await visit(ricardo.page, "/classes")
      await ricardo.page
        .getByRole("button", { name: /Reservar lugar/i })
        .first()
        .click()
      await toast(ricardo.page, /Necesitas una membresía activa/i)
    }
  )

  await runStep(
    "admin-ricardo-inactiva-visible",
    {
      phase: "16:15 Tarde",
      role: "admin",
      expected: "La membresía INACTIVA de Ricardo aparece en el panel de admin",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/admin/memberships")
      await admin.page.getByRole("tab", { name: /Vencidas/i }).click()
      await admin.page.getByPlaceholder(/Buscar por nombre, email o plan/i).fill("Ricardo")
      const visible = await admin.page
        .getByText("Ricardo Medina")
        .isVisible()
        .catch(() => false)
      if (!visible) {
        throw new Error(
          "La membresía INACTIVE de Ricardo no aparece en el tab Vencidas ni en ningún otro filtro"
        )
      }
    }
  )

  await runStep(
    "admin-renueva-ricardo",
    {
      phase: "16:30 Tarde",
      role: "admin",
      expected: "El admin renueva una membresía vencida desde el panel",
      notes: "Time travel: Ricardo pasa de INACTIVE a EXPIRED antes de renovar",
    },
    admin.page,
    async () => {
      await expireMembership(USERS.ricardo)
      await visit(admin.page, "/admin/memberships")
      await admin.page.getByRole("tab", { name: /Vencidas/i }).click()
      await admin.page.getByPlaceholder(/Buscar por nombre, email o plan/i).fill("Ricardo")
      const card = admin.page
        .locator('[data-slot="card"]')
        .filter({ hasText: "Ricardo Medina" })
        .first()
      await expect(card).toBeVisible({ timeout: 20_000 })
      await card.getByRole("button", { name: /Renovar/i }).click()
      await toast(admin.page, /Membresía renovada correctamente/i)

      const membership = await getMembership(USERS.ricardo)
      if (membership?.status !== "ACTIVE") {
        throw new Error(`La membresía no quedó ACTIVE: ${membership?.status}`)
      }
      if (!membership.endDate || membership.endDate.getTime() <= Date.now()) {
        throw new Error(
          `Renovar no extendió endDate: ${membership.endDate?.toISOString() ?? "null"} (ahora ${new Date().toISOString()})`
        )
      }
    }
  )

  // ── 17:00 — Invitación expirada ────────────────────────────────────────
  await runStep(
    "invite-expirada",
    {
      phase: "17:00 Tarde",
      role: "trainer2",
      expected: "Una invitación vencida responde 410",
      notes: "Time travel: expiresAt se mueve al pasado en la BD",
    },
    requireSession("trainer2").page,
    async () => {
      await expireInvite("demo-invite-andrea-mariana")
      const response = await requireSession("trainer2").page.request.get(
        "/api/trainer/invites/demo-invite-andrea-mariana"
      )
      expect(response.status()).toBe(410)
      const body = (await response.json()) as { error?: string }
      expect(body.error ?? "").toMatch(/expirado/i)
    }
  )

  // ── 18:00 — Notificaciones y cierre de día ─────────────────────────────
  await runStep(
    "notificaciones-carlos",
    {
      phase: "18:00 Tarde",
      role: "carlos",
      expected: "Listado de notificaciones accesible",
    },
    carlos.page,
    async () => {
      await visit(carlos.page, "/notifications")
      await expect(
        carlos.page.getByRole("heading", { level: 1, name: /^Notificaciones$/i })
      ).toBeVisible({
        timeout: 20_000,
      })
      await expect(carlos.page.getByText(/Bienvenido a Fitness Total/i).first()).toBeVisible()
    }
  )

  await runStep(
    "admin-membresia-sofia-renovada",
    {
      phase: "18:30 Tarde",
      role: "admin",
      expected: "Sofía aparece como activa tras la renovación",
    },
    admin.page,
    async () => {
      await visit(admin.page, "/admin/memberships")
      await admin.page.getByRole("tab", { name: /Activas/i }).click()
      await expect(admin.page.getByText("Sofía Castillo")).toBeVisible({ timeout: 20_000 })
    }
  )

  await runStep(
    "health-check",
    {
      phase: "19:00 Cierre",
      role: "admin",
      expected: "API de salud responde 200",
    },
    admin.page,
    async () => {
      const response = await admin.page.request.get("/api/health")
      expect(response.status()).toBe(200)
      const body = (await response.json()) as { status?: string }
      expect(body.status).toBe("ok")
    }
  )

  await runStep(
    "sin-errores-500",
    {
      phase: "19:00 Cierre",
      role: "todos",
      expected: "Ninguna sesión registró errores HTTP 5xx",
    },
    null,
    async () => {
      const serverErrors = Array.from(sessions.entries()).flatMap(([key, session]) =>
        session.errors
          .filter((error) => error.startsWith("HTTP 5"))
          .map((error) => `${key}: ${error}`)
      )
      expect(serverErrors).toEqual([])
    }
  )

  const failedSteps = results.filter((item) => item.status === "failed")
  if (failedSteps.length > 0) {
    throw new Error(
      `${failedSteps.length} pasos fallaron: ${failedSteps.map((item) => item.id).join(", ")}. Ver VALIDATION_REPORT.md para el detalle y los fixes sugeridos.`
    )
  }
})
