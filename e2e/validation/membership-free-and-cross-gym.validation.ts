import { test, expect, type Browser, type Page } from "@playwright/test"
import bcrypt from "bcryptjs"
import { findUser, prisma } from "./db"
import { SEED_PASSWORD } from "../seed-password"

/**
 * Plan gratuito y permisos entre gimnasios sobre pagos y membresías (#23):
 *
 * 1. Un miembro sin membresía elige un plan gratuito en Membresía y lo activa con
 *    «Activar plan gratis»: la membresía queda activa y pagada sin pasar por un pago,
 *    y ya puede reservar.
 * 2. El admin de OTRO gimnasio no ve los pagos pendientes de un gimnasio ajeno, no puede
 *    confirmarlos, rechazarlos ni registrarlos a mano, no puede renovar ni asignar
 *    membresías de ese gimnasio ni tocar sus planes. Con su propio gimnasio sí puede
 *    asignar, y el admin del gimnasio dueño sí confirma el pago.
 *
 * Todo lo que usa (gimnasio ajeno, admin, miembros, planes, clase, pagos) se crea en la
 * corrida con nombres únicos y se borra al terminar: no toca los datos del seed.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const PASSWORD = SEED_PASSWORD
const ADMIN = "admin@gymapp.com"
const COACH = "trainer@gymapp.com"

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Caso 1: plan gratuito activado por el miembro.
const FREE = {
  memberEmail: `e2e-gratis-${RUN}@gymapp.test`,
  memberName: `Miembro Gratis ${RUN}`,
  freePlanName: `Plan Gratis E2E ${RUN}`,
  paidPlanName: `Plan Pagado E2E ${RUN}`,
  className: `Clase Gratis E2E ${RUN}`,
}
const FREE_PLAN_DAYS = 14

// Caso 2: admin de otro gimnasio.
const CROSS = {
  gymName: `Gimnasio Ajeno E2E ${RUN}`,
  gymSlug: `e2e-ajeno-${RUN}`,
  adminEmail: `e2e-admin-ajeno-${RUN}@gymapp.test`,
  ownMemberEmail: `e2e-miembro-ajeno-${RUN}@gymapp.test`,
  ownPlanName: `Plan Ajeno E2E ${RUN}`,
  targetMemberEmail: `e2e-objetivo-${RUN}@gymapp.test`,
  targetMemberName: `Miembro Objetivo ${RUN}`,
  targetPlanName: `Plan Objetivo E2E ${RUN}`,
}

const WRITE_TIMEOUT = 30_000

test.describe.configure({ mode: "serial" })
test.setTimeout(5 * 60_000)

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

async function createUser(data: {
  email: string
  name: string
  role: "MEMBER" | "ADMIN"
  gymId: string
  assignedTrainerId?: string
}) {
  return prisma.user.create({
    data: {
      ...data,
      password: await bcrypt.hash(PASSWORD, 10),
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  })
}

/** Borra usuarios con todo lo que cuelga de ellos, aunque la prueba se haya cortado. */
async function removeUsers(emails: string[]) {
  const users = await prisma.user.findMany({ where: { email: { in: emails } } })
  const ids = users.map((user) => user.id)
  if (ids.length === 0) return
  await prisma.booking.deleteMany({ where: { userId: { in: ids } } })
  for (const id of ids) {
    await prisma.notification.deleteMany({
      where: { metadata: { path: ["clientId"], equals: id } },
    })
  }
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } })
  await prisma.payment.deleteMany({ where: { userId: { in: ids } } })
  await prisma.membership.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

function pathIs(pathname: string, method: string) {
  return (response: { url(): string; request(): { method(): string } }) =>
    new URL(response.url()).pathname === pathname && response.request().method() === method
}

test("el miembro activa un plan gratuito y ya puede reservar", async ({ browser }) => {
  const coach = await findUser(COACH)
  const gymId = coach.gymId
  if (!gymId) throw new Error(`${COACH} no tiene gimnasio`)

  const member = await createUser({
    email: FREE.memberEmail,
    name: FREE.memberName,
    role: "MEMBER",
    gymId,
    assignedTrainerId: coach.id,
  })
  const freePlan = await prisma.membershipPlan.create({
    data: { gymId, name: FREE.freePlanName, price: 0, durationDays: FREE_PLAN_DAYS },
  })
  // Un plan de pago al lado sirve para comprobar que el formulario ya está hidratado.
  await prisma.membershipPlan.create({
    data: { gymId, name: FREE.paidPlanName, price: 1, durationDays: 30 },
  })
  const classItem = await prisma.class.create({
    data: {
      gymId,
      name: FREE.className,
      trainerId: coach.id,
      capacity: 5,
      duration: 45,
      dayOfWeek: "SUNDAY",
      startTime: "07:00",
    },
  })
  const pages: Page[] = []

  try {
    const memberPage = await login(browser, FREE.memberEmail)
    pages.push(memberPage)

    // 1. Sin membresía no puede reservar, y el plan gratuito no se "paga" con comprobante.
    const notYet = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(notYet.status()).toBe(403)
    expect((await notYet.json()).code).toBe("MEMBERSHIP_REQUIRED")

    const paidRoute = await memberPage.request.post("/api/payments", {
      multipart: { planId: freePlan.id, method: "CASH" },
    })
    expect(paidRoute.status()).toBe(400)

    // 2. En Membresía elige el plan gratuito.
    await memberPage.goto("/membresia", { waitUntil: "domcontentloaded" })
    const main = memberPage.getByRole("main")
    await expect(
      memberPage.getByRole("heading", { level: 1, name: "Membresía", exact: true })
    ).toBeVisible()
    await expect(main.getByText("Aún no tienes una membresía activa.")).toBeVisible()

    const freeOption = memberPage.locator("label").filter({ hasText: FREE.freePlanName })
    const paidOption = memberPage.locator("label").filter({ hasText: FREE.paidPlanName })
    const activate = memberPage.getByRole("button", { name: "Activar plan gratis" })
    // El botón cambia de texto al cambiar de plan: eso solo pasa con React hidratado. Con la CI
    // cargada, el servidor de desarrollo puede tardar más de 30 s en compilar e hidratar la
    // página (#230): cada intento espera 5 s y el total llega a 90 s.
    await expect(async () => {
      await paidOption.click()
      await expect(activate).toHaveCount(0, { timeout: 5_000 })
      await freeOption.click()
      await expect(activate).toBeVisible({ timeout: 5_000 })
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 90_000 })

    await expect(freeOption.getByRole("radio")).toBeChecked()
    await expect(freeOption.getByText("Gratis", { exact: true })).toBeVisible()
    await expect(main.getByText("Este plan es gratuito: se activa al confirmar.")).toBeVisible()
    await expect(memberPage.locator("#newPaymentMethod")).toHaveCount(0)
    await expect(memberPage.locator("#newPaymentReceipt")).toHaveCount(0)

    const [activated] = await Promise.all([
      memberPage.waitForResponse(pathIs("/api/memberships/self", "POST")),
      activate.click(),
    ])
    expect(activated.status()).toBe(201)
    await expect(memberPage.getByText("Tu plan quedó activo.")).toBeVisible({
      timeout: WRITE_TIMEOUT,
    })

    // 3. La membresía queda activa y pagada, sin pagos pendientes.
    await expect(memberPage.getByRole("heading", { level: 1, name: "Mi Membresía" })).toBeVisible({
      timeout: WRITE_TIMEOUT,
    })
    await expect(main.getByText(FREE.freePlanName).first()).toBeVisible()
    await expect(main.getByText("Activa", { exact: true })).toBeVisible()
    await expect(main.getByText("Pagado", { exact: true })).toBeVisible()
    await expect(main.getByText("Pago pendiente")).toHaveCount(0)
    await expect(main.getByText("Pendiente de confirmar en recepción")).toHaveCount(0)

    const membership = await prisma.membership.findFirstOrThrow({ where: { userId: member.id } })
    expect(membership.planId).toBe(freePlan.id)
    expect(membership.status).toBe("ACTIVE")
    expect(membership.paymentConfirmed).toBe(true)
    expect(membership.paymentMethod).toBe("OTHER")
    expect(Number(membership.planPrice)).toBe(0)
    expect(membership.planDurationDays).toBe(FREE_PLAN_DAYS)
    expect(membership.endDate.getTime()).toBeGreaterThan(
      Date.now() + (FREE_PLAN_DAYS - 1) * 86_400_000
    )
    expect(await prisma.payment.count({ where: { userId: member.id } })).toBe(0)

    // Un segundo intento no crea otra membresía.
    const again = await memberPage.request.post("/api/memberships/self", {
      data: { planId: freePlan.id },
    })
    expect(again.status()).toBe(409)
    expect(await prisma.membership.count({ where: { userId: member.id } })).toBe(1)

    // 4. Ya puede reservar.
    const booked = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(booked.status()).toBe(201)
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
    await removeUsers([FREE.memberEmail])
    await prisma.class.deleteMany({ where: { name: FREE.className } })
    await prisma.membershipPlan.deleteMany({
      where: { name: { in: [FREE.freePlanName, FREE.paidPlanName] } },
    })
  }
})

test("el admin de otro gimnasio no puede ver ni gestionar pagos ni membresías ajenos", async ({
  browser,
}) => {
  const coach = await findUser(COACH)
  const homeGymId = coach.gymId
  if (!homeGymId) throw new Error(`${COACH} no tiene gimnasio`)
  const homeAdmin = await findUser(ADMIN)
  expect(homeAdmin.gymId).toBe(homeGymId)

  // Gimnasio ajeno con su admin, un miembro y un plan propios.
  const otherGym = await prisma.gym.create({ data: { name: CROSS.gymName, slug: CROSS.gymSlug } })
  const pages: Page[] = []

  try {
    const otherAdmin = await createUser({
      email: CROSS.adminEmail,
      name: `Admin Ajeno ${RUN}`,
      role: "ADMIN",
      gymId: otherGym.id,
    })
    const ownMember = await createUser({
      email: CROSS.ownMemberEmail,
      name: `Miembro Ajeno ${RUN}`,
      role: "MEMBER",
      gymId: otherGym.id,
    })
    const ownPlan = await prisma.membershipPlan.create({
      data: { gymId: otherGym.id, name: CROSS.ownPlanName, price: 45, durationDays: 30 },
    })

    // En el gimnasio del seed: un miembro con su plan, todavía sin membresía.
    const target = await createUser({
      email: CROSS.targetMemberEmail,
      name: CROSS.targetMemberName,
      role: "MEMBER",
      gymId: homeGymId,
      assignedTrainerId: coach.id,
    })
    const targetPlan = await prisma.membershipPlan.create({
      data: { gymId: homeGymId, name: CROSS.targetPlanName, price: 55, durationDays: 30 },
    })

    const adminPage = await login(browser, CROSS.adminEmail)
    pages.push(adminPage)
    const api = adminPage.request

    // 1. No puede asignar membresías que mezclen su gimnasio con el ajeno.
    for (const data of [
      { userId: target.id, planId: targetPlan.id },
      { userId: target.id, planId: ownPlan.id },
      { userId: ownMember.id, planId: targetPlan.id },
    ]) {
      const response = await api.post("/api/memberships", {
        data: { ...data, paymentMethod: "CASH" },
      })
      expect(response.status(), JSON.stringify(data)).toBe(403)
    }
    expect(await prisma.membership.count({ where: { userId: target.id } })).toBe(0)
    expect(await prisma.membership.count({ where: { userId: ownMember.id } })).toBe(0)

    // Con su propio miembro y su propio plan sí puede: la sesión funciona.
    const ownAssign = await api.post("/api/memberships", {
      data: { userId: ownMember.id, planId: ownPlan.id, paymentMethod: "CASH" },
    })
    expect(ownAssign.status()).toBe(201)

    // 2. Tampoco puede tocar los planes del gimnasio ajeno.
    const planPatch = await api.patch(`/api/membership-plans/${targetPlan.id}`, {
      data: { price: 1 },
    })
    expect(planPatch.status()).toBe(403)
    const planDelete = await api.delete(`/api/membership-plans/${targetPlan.id}`)
    expect(planDelete.status()).toBe(403)
    const planAfter = await prisma.membershipPlan.findUniqueOrThrow({
      where: { id: targetPlan.id },
    })
    expect(Number(planAfter.price)).toBe(55)

    // 3. El miembro del gimnasio ajeno avisa que pagará en efectivo en recepción.
    const now = new Date()
    const membership = await prisma.membership.create({
      data: {
        userId: target.id,
        planId: targetPlan.id,
        status: "ACTIVE",
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 86_400_000),
        paymentConfirmed: false,
        paymentMethod: "CASH",
        planPrice: targetPlan.price,
        planCurrency: targetPlan.currency,
        planDurationDays: targetPlan.durationDays,
      },
    })
    const payment = await prisma.payment.create({
      data: {
        userId: target.id,
        membershipId: membership.id,
        amount: targetPlan.price,
        currency: targetPlan.currency,
        status: "PENDING",
        method: "CASH",
        type: "MEMBERSHIP",
      },
    })

    // 4. No ve ese pago en su bandeja ni en su contador.
    const pendingList = await api.get("/api/payments/pending")
    expect(pendingList.status()).toBe(200)
    const { payments } = (await pendingList.json()) as { payments: { id: string }[] }
    expect(payments.map((item) => item.id)).not.toContain(payment.id)
    const pendingCount = await api.get("/api/payments/pending-count")
    expect((await pendingCount.json()).count).toBe(0)

    // Ni en su panel de Membresías, donde sí aparece su propio miembro.
    await adminPage.goto("/admin/memberships", { waitUntil: "domcontentloaded" })
    const main = adminPage.getByRole("main")
    await expect(adminPage.getByRole("heading", { level: 1, name: "Membresías" })).toBeVisible()
    await expect(
      main.locator('[data-slot="card"]').filter({ hasText: CROSS.ownMemberEmail })
    ).toHaveCount(1)
    await expect(main.getByText(CROSS.targetMemberEmail)).toHaveCount(0)
    await expect(main.getByText(CROSS.targetMemberName)).toHaveCount(0)
    await expect(main.getByText(CROSS.targetPlanName)).toHaveCount(0)

    // 5. No puede confirmar ni rechazar el pago, ni registrarlo a mano.
    const confirm = await api.put(`/api/payments/${payment.id}`, {
      data: { action: "CONFIRM" },
    })
    expect(confirm.status()).toBe(403)
    const reject = await api.put(`/api/payments/${payment.id}`, {
      data: { action: "REJECT", notes: "No corresponde" },
    })
    expect(reject.status()).toBe(403)
    const manual = await api.post("/api/payments/manual", {
      data: { membershipId: membership.id, method: "CASH" },
    })
    expect(manual.status()).toBe(403)

    // 6. Ni renovar la membresía ajena (responde como si no existiera).
    const renew = await api.patch(`/api/memberships/${membership.id}`, {
      data: { renew: true },
    })
    expect(renew.status()).toBe(404)

    const untouched = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { membership: true },
    })
    expect(untouched.status).toBe("PENDING")
    expect(untouched.confirmedById).toBeNull()
    expect(untouched.membership?.paymentConfirmed).toBe(false)
    expect(untouched.membership?.endDate.getTime()).toBe(membership.endDate.getTime())
    expect(await prisma.payment.count({ where: { userId: target.id } })).toBe(1)
    expect(await prisma.notification.count({ where: { userId: target.id } })).toBe(0)
    expect(await prisma.payment.count({ where: { confirmedById: otherAdmin.id } })).toBe(0)

    // 7. El admin del gimnasio dueño sí lo confirma: el pago estaba en regla.
    const homeAdminPage = await login(browser, ADMIN)
    pages.push(homeAdminPage)
    const homeConfirm = await homeAdminPage.request.put(`/api/payments/${payment.id}`, {
      data: { action: "CONFIRM" },
    })
    expect(homeConfirm.status()).toBe(200)
    const done = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { membership: true },
    })
    expect(done.status).toBe("COMPLETED")
    expect(done.confirmedById).toBe(homeAdmin.id)
    expect(done.membership?.paymentConfirmed).toBe(true)
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
    await removeUsers([CROSS.adminEmail, CROSS.ownMemberEmail, CROSS.targetMemberEmail])
    await prisma.membershipPlan.deleteMany({
      where: { name: { in: [CROSS.ownPlanName, CROSS.targetPlanName] } },
    })
    await prisma.gym.deleteMany({ where: { id: otherGym.id } })
  }
})
