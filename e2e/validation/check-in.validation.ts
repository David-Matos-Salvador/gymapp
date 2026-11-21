import { test, expect, type Browser, type Page } from "@playwright/test"
import bcrypt from "bcryptjs"
import { findUser, prisma } from "./db"

/**
 * Check-in (#23).
 *
 * La app todavía NO tiene check-in con QR: no hay QR del miembro, ni pantalla de escaneo,
 * ni registro en recepción. Lo único que existe es la API de autoservicio
 * (`POST /api/check-ins`, `GET /api/check-ins`, `DELETE /api/check-ins/[id]`) y el panel
 * del admin, que muestra los check-ins de su gimnasio en «Actividad reciente». La feature
 * está diferida (MBR-18 en `docs/roles/member/decisions.md`), con estas reglas pendientes:
 * una vez por día calendario, membresía pagada y gimnasio derivado del usuario.
 *
 * Este spec cubre lo que hoy funciona y deja con `test.fixme` las reglas que la API aún
 * no cumple:
 *
 * 1. Un miembro con membresía activa registra su check-in: queda en su gimnasio, lo ve en
 *    su historial y el admin de su gimnasio lo ve en el panel. No puede registrarlo en
 *    otro gimnasio, ni sin sesión.
 * 2. Permisos para borrar un check-in por rol: otro miembro y el coach del mismo gimnasio
 *    no pueden (403); el admin de otro gimnasio no lo encuentra (404); el admin de su
 *    gimnasio sí puede, y el propio miembro también.
 * 3. (fixme) Sin membresía activa y pagada, el check-in se rechaza.
 * 4. (fixme) Un segundo check-in el mismo día no crea otro registro.
 *
 * Todo (gimnasio, admin, coach, miembros, plan, membresías y check-ins) se crea en la
 * corrida con nombres únicos y se borra al terminar: no toca los datos del seed.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const PASSWORD = "demo123"
const SEED_ADMIN = "admin@gymapp.com"

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const GYM = { name: `Gimnasio Check-in E2E ${RUN}`, slug: `e2e-checkin-${RUN}` }
const PLAN_NAME = `Plan Check-in E2E ${RUN}`
const ADMIN = { email: `e2e-ci-admin-${RUN}@gymapp.test`, name: `Admin Check-in ${RUN}` }
const COACH = { email: `e2e-ci-coach-${RUN}@gymapp.test`, name: `Coach Check-in ${RUN}` }
const MEMBER = { email: `e2e-ci-miembro-${RUN}@gymapp.test`, name: `Miembro Check-in ${RUN}` }
const OTHER = { email: `e2e-ci-otro-${RUN}@gymapp.test`, name: `Otro Miembro ${RUN}` }
const NO_PLAN = { email: `e2e-ci-sinplan-${RUN}@gymapp.test`, name: `Sin Plan ${RUN}` }
const UNPAID = { email: `e2e-ci-impago-${RUN}@gymapp.test`, name: `Impago ${RUN}` }
const EXPIRED = { email: `e2e-ci-vencido-${RUN}@gymapp.test`, name: `Vencido ${RUN}` }
const ALL_EMAILS = [ADMIN, COACH, MEMBER, OTHER, NO_PLAN, UNPAID, EXPIRED].map((u) => u.email)

const DAY = 86_400_000

test.describe.configure({ mode: "serial" })
test.setTimeout(5 * 60_000)

let gymId = ""
let planId = ""

async function login(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  // Si el clic llega antes de la hidratación, el formulario no inicia sesión: se reintenta.
  await expect(async () => {
    await page.goto("/login", { waitUntil: "networkidle" })
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.getByRole("button", { name: /iniciar sesión/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 })
  }).toPass({ timeout: 60_000 })
  return page
}

async function createUser(
  data: { email: string; name: string },
  role: "MEMBER" | "TRAINER" | "ADMIN" = "MEMBER"
) {
  return prisma.user.create({
    data: {
      ...data,
      role,
      gymId,
      password: await bcrypt.hash(PASSWORD, 10),
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  })
}

async function giveMembership(
  userId: string,
  { paid = true, endsInDays = 30 }: { paid?: boolean; endsInDays?: number } = {}
) {
  const now = Date.now()
  return prisma.membership.create({
    data: {
      userId,
      planId,
      status: endsInDays > 0 ? "ACTIVE" : "EXPIRED",
      startDate: new Date(now - 30 * DAY),
      endDate: new Date(now + endsInDays * DAY),
      paymentConfirmed: paid,
      paymentMethod: "CASH",
      planPrice: 40,
      planDurationDays: 30,
    },
  })
}

async function removeEverything() {
  const users = await prisma.user.findMany({ where: { email: { in: ALL_EMAILS } } })
  const ids = users.map((user) => user.id)
  if (ids.length > 0) {
    await prisma.checkIn.deleteMany({ where: { userId: { in: ids } } })
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } })
    await prisma.payment.deleteMany({ where: { userId: { in: ids } } })
    await prisma.membership.deleteMany({ where: { userId: { in: ids } } })
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
  }
  if (gymId) await prisma.checkIn.deleteMany({ where: { gymId } })
  await prisma.membershipPlan.deleteMany({ where: { name: PLAN_NAME } })
  await prisma.gym.deleteMany({ where: { slug: GYM.slug } })
}

test.beforeAll(async () => {
  const gym = await prisma.gym.create({ data: GYM })
  gymId = gym.id
  const plan = await prisma.membershipPlan.create({
    data: { gymId, name: PLAN_NAME, price: 40, durationDays: 30 },
  })
  planId = plan.id
})

test.afterAll(async () => {
  await removeEverything()
})

test("el miembro con membresía activa registra su check-in y lo ve el admin de su gimnasio", async ({
  browser,
  request,
}) => {
  const seedAdmin = await findUser(SEED_ADMIN)
  expect(seedAdmin.gymId).toBeTruthy()
  expect(seedAdmin.gymId).not.toBe(gymId)

  await createUser(ADMIN, "ADMIN")
  const member = await createUser(MEMBER)
  await giveMembership(member.id)
  const pages: Page[] = []

  try {
    // 1. Sin sesión no se puede registrar ni consultar.
    const anonymous = await request.post("/api/check-ins", { data: {} })
    expect(anonymous.status()).toBe(401)
    const anonymousList = await request.get("/api/check-ins")
    expect(anonymousList.status()).toBe(401)

    const memberPage = await login(browser, MEMBER.email)
    pages.push(memberPage)
    const api = memberPage.request

    // 2. Check-in válido: queda en su gimnasio, con la hora actual.
    const before = Date.now()
    const created = await api.post("/api/check-ins", { data: {} })
    expect(created.status()).toBe(201)
    const { checkIn } = (await created.json()) as { checkIn: { id: string } }

    const row = await prisma.checkIn.findUniqueOrThrow({ where: { id: checkIn.id } })
    expect(row.userId).toBe(member.id)
    expect(row.gymId).toBe(gymId)
    expect(row.date.getTime()).toBeGreaterThanOrEqual(before - 60_000)
    expect(row.date.getTime()).toBeLessThanOrEqual(Date.now() + 60_000)

    // 3. No puede registrarlo en otro gimnasio.
    const crossGym = await api.post("/api/check-ins", { data: { gymId: seedAdmin.gymId } })
    expect(crossGym.status()).toBe(400)
    expect((await crossGym.json()).error).toBe("No puedes registrar check-in en otro gimnasio")
    expect(await prisma.checkIn.count({ where: { userId: member.id } })).toBe(1)
    expect(
      await prisma.checkIn.count({ where: { userId: member.id, gymId: { not: gymId } } })
    ).toBe(0)

    // 4. Lo ve en su historial (solo los suyos).
    const list = await api.get("/api/check-ins")
    expect(list.status()).toBe(200)
    const { checkIns } = (await list.json()) as { checkIns: { id: string; userId: string }[] }
    expect(checkIns.map((item) => item.id)).toEqual([checkIn.id])

    // 5. El admin de su gimnasio lo ve en «Actividad reciente» del panel.
    const adminPage = await login(browser, ADMIN.email)
    pages.push(adminPage)
    await adminPage.goto("/dashboard", { waitUntil: "domcontentloaded" })
    const main = adminPage.getByRole("main")
    await expect(main.getByText("Actividad reciente")).toBeVisible()
    // Su gimnasio no tiene entrenamientos, así que la lista solo muestra el check-in.
    await expect(main.getByText(MEMBER.name, { exact: true })).toBeVisible()
    await expect(main.getByText("Check-in", { exact: true })).toHaveCount(1)
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
  }
})

test("permisos para borrar un check-in según el rol", async ({ browser }) => {
  const member = await findUser(MEMBER.email)
  const other = await createUser(OTHER)
  await giveMembership(other.id)
  await createUser(COACH, "TRAINER")

  // Un check-in fresco para cada intento de borrado exitoso.
  const first = await prisma.checkIn.create({ data: { userId: member.id, gymId } })
  const second = await prisma.checkIn.create({
    data: { userId: member.id, gymId, date: new Date(Date.now() - DAY) },
  })
  const pages: Page[] = []

  try {
    // 1. Otro miembro del mismo gimnasio: 403.
    const otherPage = await login(browser, OTHER.email)
    pages.push(otherPage)
    const byOther = await otherPage.request.delete(`/api/check-ins/${first.id}`)
    expect(byOther.status()).toBe(403)
    // Y no lo ve en su historial.
    const otherList = await otherPage.request.get("/api/check-ins")
    const { checkIns } = (await otherList.json()) as { checkIns: { id: string }[] }
    expect(checkIns.map((item) => item.id)).not.toContain(first.id)

    // 2. El coach del mismo gimnasio: 403.
    const coachPage = await login(browser, COACH.email)
    pages.push(coachPage)
    const byCoach = await coachPage.request.delete(`/api/check-ins/${first.id}`)
    expect(byCoach.status()).toBe(403)

    // 3. El admin de otro gimnasio: responde como si no existiera.
    const seedAdminPage = await login(browser, SEED_ADMIN)
    pages.push(seedAdminPage)
    const byForeignAdmin = await seedAdminPage.request.delete(`/api/check-ins/${first.id}`)
    expect(byForeignAdmin.status()).toBe(404)

    expect(await prisma.checkIn.count({ where: { id: { in: [first.id, second.id] } } })).toBe(2)

    // 4. El admin de su gimnasio sí lo borra.
    const adminPage = await login(browser, ADMIN.email)
    pages.push(adminPage)
    const byAdmin = await adminPage.request.delete(`/api/check-ins/${first.id}`)
    expect(byAdmin.status()).toBe(200)
    expect(await prisma.checkIn.findUnique({ where: { id: first.id } })).toBeNull()
    const again = await adminPage.request.delete(`/api/check-ins/${first.id}`)
    expect(again.status()).toBe(404)

    // 5. El propio miembro borra el suyo.
    const memberPage = await login(browser, MEMBER.email)
    pages.push(memberPage)
    const byMember = await memberPage.request.delete(`/api/check-ins/${second.id}`)
    expect(byMember.status()).toBe(200)
    expect(await prisma.checkIn.findUnique({ where: { id: second.id } })).toBeNull()
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
  }
})

// FALLO DE LA APP: `POST /api/check-ins` no revisa la membresía; responde 201 a un miembro
// sin membresía, con el pago sin confirmar o vencida. La regla está acordada en
// `docs/roles/member/decisions.md` (política 2 y MBR-18) pero no implementada.
test.fixme("sin membresía activa y pagada el check-in se rechaza", async ({ browser }) => {
  const noPlan = await createUser(NO_PLAN)
  const unpaid = await createUser(UNPAID)
  await giveMembership(unpaid.id, { paid: false })
  const expired = await createUser(EXPIRED)
  await giveMembership(expired.id, { endsInDays: -1 })
  const pages: Page[] = []

  try {
    for (const user of [noPlan, unpaid, expired]) {
      const page = await login(browser, user.email)
      pages.push(page)
      const response = await page.request.post("/api/check-ins", { data: {} })
      expect(response.status(), user.email).toBe(403)
      expect(await prisma.checkIn.count({ where: { userId: user.id } }), user.email).toBe(0)
    }
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
  }
})

// FALLO DE LA APP: cada `POST /api/check-ins` crea un registro nuevo. La restricción única
// `@@unique([userId, date])` usa la fecha con hora, así que nunca choca y el mismo miembro
// puede marcar asistencia varias veces el mismo día (infla «Asistencia diaria»). MBR-18
// pide una vez por día calendario.
test.fixme("un segundo check-in el mismo día no crea otro registro", async ({ browser }) => {
  const member = await findUser(MEMBER.email)
  await prisma.checkIn.deleteMany({ where: { userId: member.id } })
  const page = await login(browser, MEMBER.email)

  try {
    const first = await page.request.post("/api/check-ins", { data: {} })
    expect(first.status()).toBe(201)
    const second = await page.request.post("/api/check-ins", { data: {} })
    expect([200, 409]).toContain(second.status())
    expect(await prisma.checkIn.count({ where: { userId: member.id } })).toBe(1)
  } finally {
    await page.context().close()
  }
})
