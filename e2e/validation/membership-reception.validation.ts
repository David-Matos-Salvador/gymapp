import { test, expect, type Browser, type Page } from "@playwright/test"
import bcrypt from "bcryptjs"
import { findUser, prisma } from "./db"
import { SEED_PASSWORD } from "../seed-password"

/**
 * Membresías asignadas por el admin y pagos en recepción, de punta a punta (#23):
 *
 * 1. El admin crea un plan en Gestión del Gimnasio y, desde el panel de Membresías,
 *    le asigna una membresía a un miembro (queda con el pago pendiente). El miembro
 *    avisa que pagará con tarjeta en recepción y el admin confirma ese pago desde el
 *    panel («Revisar pago»). La membresía queda activa y el miembro ya puede reservar.
 * 2. Un miembro sin membresía elige un plan y paga en efectivo («Pagaré en recepción»),
 *    sin comprobante. Su coach confirma el pago en Comprobantes y la membresía queda
 *    activa.
 *
 * Todo lo que usa se crea en la corrida (miembros, planes y clases con nombres únicos)
 * y se borra al terminar: no toca a los usuarios ni los pagos del seed.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const PASSWORD = SEED_PASSWORD
const ADMIN = "admin@gymapp.com"
const COACH = "trainer@gymapp.com"

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Caso 1: plan creado por el admin desde la interfaz.
const ADMIN_FLOW = {
  memberEmail: `e2e-asignada-${RUN}@gymapp.test`,
  memberName: `Miembro Asignado ${RUN}`,
  planName: `Plan Admin E2E ${RUN}`,
  className: `Clase Admin E2E ${RUN}`,
}
const ADMIN_PLAN_PRICE = 64
// El formato de moneda puede llevar espacio duro entre S/ y el monto.
const ADMIN_PLAN_PRICE_TEXT = /S\/\s*64\.00/

// Caso 2: plan creado en la base, el miembro paga en efectivo.
const CASH_FLOW = {
  memberEmail: `e2e-efectivo-${RUN}@gymapp.test`,
  memberName: `Miembro Efectivo ${RUN}`,
  planName: `Plan Efectivo E2E ${RUN}`,
  className: `Clase Efectivo E2E ${RUN}`,
}
const CASH_PLAN_PRICE = 59
const CASH_PLAN_PRICE_TEXT = /S\/\s*59\.00/

// Avisos tras acciones que escriben en la base: el runner de CI es lento.
const WRITE_TIMEOUT = 30_000

type Flow = typeof ADMIN_FLOW

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

/** Miembro (cliente del coach del seed) y clase propios de la corrida. */
async function createMemberAndClass(flow: Flow) {
  const coach = await findUser(COACH)
  if (!coach.gymId) throw new Error(`${COACH} no tiene gimnasio`)

  const member = await prisma.user.create({
    data: {
      email: flow.memberEmail,
      name: flow.memberName,
      password: await bcrypt.hash(PASSWORD, 10),
      role: "MEMBER",
      gymId: coach.gymId,
      assignedTrainerId: coach.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  })
  const classItem = await prisma.class.create({
    data: {
      gymId: coach.gymId,
      name: flow.className,
      trainerId: coach.id,
      capacity: 5,
      duration: 45,
      dayOfWeek: "SUNDAY",
      startTime: "07:00",
    },
  })

  return { coach, member, classItem }
}

/** Borra lo creado por la corrida, aunque la prueba se haya cortado a medias. */
async function removeFixtures(flow: Flow) {
  const member = await prisma.user.findUnique({ where: { email: flow.memberEmail } })
  if (member) {
    await prisma.booking.deleteMany({ where: { userId: member.id } })
    await prisma.notification.deleteMany({
      where: { metadata: { path: ["clientId"], equals: member.id } },
    })
    await prisma.notification.deleteMany({ where: { userId: member.id } })
    await prisma.payment.deleteMany({ where: { userId: member.id } })
    await prisma.membership.deleteMany({ where: { userId: member.id } })
    await prisma.user.delete({ where: { id: member.id } })
  }
  await prisma.class.deleteMany({ where: { name: flow.className } })
  await prisma.membershipPlan.deleteMany({ where: { name: flow.planName } })
}

async function openMembership(page: Page) {
  // No se espera networkidle: la conexión de notificaciones en vivo (SSE) nunca queda quieta.
  // La hidratación se comprueba en cada paso que la necesita.
  await page.goto("/membresia", { waitUntil: "domcontentloaded" })
}

function pathIs(pathname: string, method: string) {
  return (response: { url(): string; request(): { method(): string } }) =>
    new URL(response.url()).pathname === pathname && response.request().method() === method
}

test("el admin crea un plan, asigna la membresía y confirma el pago con tarjeta en recepción", async ({
  browser,
}) => {
  const flow = ADMIN_FLOW
  const { coach, member, classItem } = await createMemberAndClass(flow)
  const admin = await findUser(ADMIN)
  expect(admin.gymId).toBe(coach.gymId)
  const pages: Page[] = []

  try {
    const adminPage = await login(browser, ADMIN)
    pages.push(adminPage)

    // 1. El admin crea el plan en Gestión del Gimnasio → Planes.
    await adminPage.goto("/admin/gym-management", { waitUntil: "domcontentloaded" })
    await expect(
      adminPage.getByRole("heading", { level: 1, name: "Gestión del Gimnasio" })
    ).toBeVisible()
    // Las pestañas solo responden cuando React ya está hidratado.
    await expect(async () => {
      await adminPage.getByRole("tab", { name: "Planes" }).click()
      await expect(adminPage.getByRole("button", { name: "Nuevo plan" })).toBeVisible({
        timeout: 5_000,
      })
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 90_000 })
    await adminPage.getByRole("button", { name: "Nuevo plan" }).click()
    const planDialog = adminPage.getByRole("dialog")
    await expect(planDialog.getByRole("heading", { name: "Nuevo plan" })).toBeVisible()
    await planDialog.locator("#planName").fill(flow.planName)
    await planDialog.locator("#planDescription").fill("Plan de prueba E2E")
    await planDialog.locator("#planPrice").fill(String(ADMIN_PLAN_PRICE))
    await planDialog.locator("#planDuration").fill("30")

    const [planCreated] = await Promise.all([
      adminPage.waitForResponse(pathIs("/api/membership-plans", "POST")),
      planDialog.getByRole("button", { name: "Crear plan" }).click(),
    ])
    expect(planCreated.status()).toBe(201)
    await expect(adminPage.getByText("Plan creado")).toBeVisible({ timeout: WRITE_TIMEOUT })
    const planCard = adminPage.locator('[data-slot="card"]').filter({ hasText: flow.planName })
    await expect(planCard).toHaveCount(1)
    await expect(planCard.getByText("Activo", { exact: true })).toBeVisible()
    await expect(planCard.getByText(ADMIN_PLAN_PRICE_TEXT)).toBeVisible()

    const plan = await prisma.membershipPlan.findFirstOrThrow({ where: { name: flow.planName } })
    expect(plan.gymId).toBe(admin.gymId)
    expect(Number(plan.price)).toBe(ADMIN_PLAN_PRICE)
    expect(plan.durationDays).toBe(30)
    expect(plan.active).toBe(true)

    // 2. Desde Membresías le asigna una membresía con ese plan al miembro.
    await adminPage.goto("/admin/memberships", { waitUntil: "domcontentloaded" })
    await expect(adminPage.getByRole("heading", { level: 1, name: "Membresías" })).toBeVisible()
    const newDialog = adminPage.getByRole("dialog")
    await expect(async () => {
      await adminPage.getByRole("button", { name: "Nueva membresía" }).click()
      await expect(newDialog.getByRole("heading", { name: "Nueva membresía" })).toBeVisible({
        timeout: 5_000,
      })
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 90_000 })

    const [memberSelect, planSelect, methodSelect] = [0, 1, 2].map((index) =>
      newDialog.getByRole("combobox").nth(index)
    )
    await memberSelect.click()
    await adminPage.getByRole("option").filter({ hasText: flow.memberEmail }).click()
    await expect(memberSelect).toContainText(flow.memberEmail)
    await planSelect.click()
    await adminPage.getByRole("option").filter({ hasText: flow.planName }).click()
    await expect(planSelect).toContainText(flow.planName)
    await expect(planSelect).toContainText(ADMIN_PLAN_PRICE_TEXT)
    await expect(methodSelect).toHaveText("Efectivo")

    const [membershipCreated] = await Promise.all([
      adminPage.waitForResponse(pathIs("/api/memberships", "POST")),
      newDialog.getByRole("button", { name: "Crear membresía" }).click(),
    ])
    expect(membershipCreated.status()).toBe(201)
    await expect(adminPage.getByText("Membresía creada; queda con pago pendiente")).toBeVisible({
      timeout: WRITE_TIMEOUT,
    })
    await expect(newDialog).toHaveCount(0)

    // La tarjeta aparece en «Pago sin confirmar», sin pago registrado todavía.
    const adminCard = adminPage.locator('[data-slot="card"]').filter({ hasText: flow.memberEmail })
    await expect(adminCard).toHaveCount(1)
    await expect(adminCard.getByText(flow.planName)).toBeVisible()
    await expect(adminCard.getByText("Pago sin confirmar")).toBeVisible()
    await expect(adminCard.getByRole("button", { name: "Registrar pago manual" })).toBeVisible()

    const assigned = await prisma.membership.findFirstOrThrow({ where: { userId: member.id } })
    expect(assigned.planId).toBe(plan.id)
    expect(assigned.status).toBe("ACTIVE")
    expect(assigned.paymentConfirmed).toBe(false)
    expect(assigned.paymentMethod).toBe("CASH")
    expect(Number(assigned.planPrice)).toBe(ADMIN_PLAN_PRICE)
    expect(assigned.endDate.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000)

    // Una segunda membresía para el mismo miembro no se crea: hay que renovar.
    const duplicate = await adminPage.request.post("/api/memberships", {
      data: { userId: member.id, planId: plan.id, paymentMethod: "CASH" },
    })
    expect(duplicate.status()).toBe(409)

    // 3. Con el pago pendiente, el miembro todavía no puede reservar.
    const memberPage = await login(browser, flow.memberEmail)
    pages.push(memberPage)
    const notYet = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(notYet.status()).toBe(403)
    expect((await notYet.json()).code).toBe("MEMBERSHIP_REQUIRED")

    // 4. El miembro ve su membresía con el pago pendiente y avisa que paga con tarjeta.
    await openMembership(memberPage)
    await expect(memberPage.getByRole("heading", { level: 1, name: "Mi Membresía" })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText(flow.planName).first()).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Pago pendiente").first()).toBeVisible()
    await expect(
      memberPage.getByRole("main").getByText("Confirmar pago", { exact: true })
    ).toBeVisible()

    const methodTrigger = memberPage.locator("#payment-method")
    await expect(async () => {
      await methodTrigger.click({ timeout: 3_000 })
      await memberPage.getByRole("option", { name: "Tarjeta" }).click({ timeout: 3_000 })
      await expect(methodTrigger).toHaveText("Tarjeta", { timeout: 5_000 })
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 90_000 })
    await expect(
      memberPage.getByRole("main").getByText(/Paga en recepción: no necesitas subir comprobante\./)
    ).toBeVisible()
    await expect(memberPage.getByRole("button", { name: "Subir comprobante" })).toHaveCount(0)

    const [announced] = await Promise.all([
      memberPage.waitForResponse(pathIs("/api/payments/receipt", "POST")),
      memberPage.getByRole("button", { name: "Pagaré en recepción" }).click(),
    ])
    expect(announced.status()).toBe(201)
    const { payment } = (await announced.json()) as { payment: { id: string } }
    await expect(
      memberPage.getByText("Listo. Tu pago queda pendiente de confirmar en recepción.")
    ).toBeVisible({ timeout: WRITE_TIMEOUT })

    await openMembership(memberPage)
    await expect(
      memberPage.getByRole("main").getByText("Pendiente de confirmar en recepción")
    ).toBeVisible()
    await expect(
      memberPage
        .getByRole("main")
        .getByText(/Avisaste que pagarás S\/\s*64\.00 en recepción \(tarjeta\)/)
    ).toBeVisible()
    await expect(memberPage.getByRole("button", { name: "Pagaré en recepción" })).toHaveCount(0)

    const pending = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    expect(pending.status).toBe("PENDING")
    expect(pending.method).toBe("CARD")
    expect(pending.receiptUrl).toBeNull()
    expect(pending.membershipId).toBe(assigned.id)
    expect(Number(pending.amount)).toBe(ADMIN_PLAN_PRICE)

    // El coach del miembro recibe el aviso del pago con tarjeta.
    const coachNotice = await prisma.notification.findFirst({
      where: { userId: coach.id, metadata: { path: ["paymentId"], equals: payment.id } },
    })
    expect(coachNotice?.title).toBe("Pago por confirmar")
    expect(coachNotice?.message).toContain("con tarjeta en recepción")

    // 5. El admin ve el pago en recepción en su panel y lo confirma.
    await adminPage.goto("/admin/memberships", { waitUntil: "domcontentloaded" })
    await expect(adminCard).toHaveCount(1)
    await expect(adminCard.getByText("Pago en recepción por confirmar (tarjeta)")).toBeVisible()
    await expect(adminCard.getByText("Sin imagen")).toBeVisible()
    await expect(adminCard.getByRole("button", { name: "Registrar pago manual" })).toHaveCount(0)

    const reviewDialog = adminPage.getByRole("dialog")
    await expect(async () => {
      await adminCard.getByRole("button", { name: "Revisar pago" }).click()
      await expect(
        reviewDialog.getByRole("heading", { name: "Confirmar pago en recepción" })
      ).toBeVisible({ timeout: 5_000 })
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 90_000 })
    await expect(reviewDialog.getByText(flow.memberName)).toBeVisible()
    await expect(reviewDialog.getByText(/se paga en recepción \(tarjeta\)/)).toBeVisible()
    await expect(reviewDialog.getByRole("img", { name: "Comprobante de pago" })).toHaveCount(0)

    const [confirmed] = await Promise.all([
      adminPage.waitForResponse(pathIs(`/api/payments/${payment.id}`, "PUT")),
      reviewDialog.getByRole("button", { name: "Confirmar pago" }).click(),
    ])
    expect(confirmed.status()).toBe(200)
    await expect(adminPage.getByText("Pago confirmado", { exact: true })).toBeVisible({
      timeout: WRITE_TIMEOUT,
    })
    await expect(reviewDialog).toHaveCount(0)

    // La membresía pasa a «Activas» y figura como pagada.
    await adminPage.getByRole("tab", { name: /^Activas/ }).click()
    await expect(adminCard).toHaveCount(1)
    await expect(adminCard.getByText("Pagado", { exact: true })).toBeVisible()

    const done = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { membership: true },
    })
    expect(done.status).toBe("COMPLETED")
    expect(done.confirmedById).toBe(admin.id)
    expect(done.membership?.paymentConfirmed).toBe(true)
    expect(done.membership?.status).toBe("ACTIVE")
    expect(done.membership?.paymentMethod).toBe("CARD")

    const memberNotice = await prisma.notification.findFirst({
      where: { userId: member.id, title: "Pago confirmado" },
    })
    expect(memberNotice?.message).toBe("El gimnasio confirmó tu pago. ¡Tu membresía está activa!")

    // 6. El miembro ve su membresía activa y pagada, y ya puede reservar.
    await openMembership(memberPage)
    await expect(memberPage.getByRole("heading", { level: 1, name: "Mi Membresía" })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Activa", { exact: true })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Pagado", { exact: true })).toBeVisible()
    await expect(
      memberPage.getByRole("main").getByText("Pendiente de confirmar en recepción")
    ).toHaveCount(0)

    const booked = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(booked.status()).toBe(201)
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
    await removeFixtures(flow)
  }
})

test("el miembro elige pagar en efectivo en recepción y su coach confirma el pago", async ({
  browser,
}) => {
  const flow = CASH_FLOW
  const { coach, member, classItem } = await createMemberAndClass(flow)
  const plan = await prisma.membershipPlan.create({
    data: { gymId: coach.gymId!, name: flow.planName, price: CASH_PLAN_PRICE, durationDays: 30 },
  })
  const pages: Page[] = []

  try {
    const memberPage = await login(browser, flow.memberEmail)
    pages.push(memberPage)

    // 1. Sin membresía, el miembro elige el plan de la corrida y el pago en efectivo.
    await openMembership(memberPage)
    await expect(
      memberPage.getByRole("heading", { level: 1, name: "Membresía", exact: true })
    ).toBeVisible()
    await expect(
      memberPage.getByRole("main").getByText("Aún no tienes una membresía activa.")
    ).toBeVisible()

    // Con efectivo el botón cambia a «Pagaré en recepción»: eso solo pasa ya hidratado.
    const methodSelect = memberPage.locator("#newPaymentMethod")
    const payAtReception = memberPage.getByRole("button", { name: "Pagaré en recepción" })
    await expect(async () => {
      await methodSelect.selectOption("YAPE")
      await methodSelect.selectOption("CASH")
      await expect(payAtReception).toBeVisible({ timeout: 5_000 })
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 90_000 })

    const planOption = memberPage.locator("label").filter({ hasText: flow.planName })
    await planOption.click()
    await expect(planOption.getByRole("radio")).toBeChecked()
    await expect(planOption.getByText(CASH_PLAN_PRICE_TEXT)).toBeVisible()
    await expect(methodSelect).toHaveValue("CASH")
    await expect(memberPage.locator("#newPaymentReceipt")).toHaveCount(0)
    await expect(
      memberPage.getByRole("main").getByText(/Paga en recepción: no necesitas subir comprobante\./)
    ).toBeVisible()

    const [created] = await Promise.all([
      memberPage.waitForResponse(pathIs("/api/payments", "POST")),
      payAtReception.click(),
    ])
    expect(created.status()).toBe(201)
    const { payment } = (await created.json()) as { payment: { id: string } }
    await expect(
      memberPage.getByText("Listo. Tu pago queda pendiente de confirmar en recepción.")
    ).toBeVisible({ timeout: WRITE_TIMEOUT })

    // 2. La membresía queda pendiente de confirmar en recepción, sin comprobante.
    await openMembership(memberPage)
    await expect(memberPage.getByRole("heading", { level: 1, name: "Mi Membresía" })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText(flow.planName).first()).toBeVisible()
    await expect(
      memberPage.getByRole("main").getByText("Pendiente de confirmar en recepción")
    ).toBeVisible()
    await expect(
      memberPage
        .getByRole("main")
        .getByText(/Avisaste que pagarás S\/\s*59\.00 en recepción \(efectivo\)/)
    ).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Pago pendiente").first()).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Comprobante en revisión")).toHaveCount(0)

    const pending = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { membership: true },
    })
    expect(pending.status).toBe("PENDING")
    expect(pending.method).toBe("CASH")
    expect(pending.receiptUrl).toBeNull()
    expect(Number(pending.amount)).toBe(CASH_PLAN_PRICE)
    expect(pending.membership?.planId).toBe(plan.id)
    expect(pending.membership?.paymentConfirmed).toBe(false)

    const coachNotice = await prisma.notification.findFirst({
      where: { userId: coach.id, metadata: { path: ["paymentId"], equals: payment.id } },
    })
    expect(coachNotice?.title).toBe("Pago por confirmar")
    expect(coachNotice?.message).toContain("en efectivo en recepción")

    // Con el pago sin confirmar sigue sin poder reservar, ni confirmarse el pago a sí mismo.
    const stillPending = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(stillPending.status()).toBe(403)
    const selfConfirm = await memberPage.request.put(`/api/payments/${payment.id}`, {
      data: { action: "CONFIRM" },
    })
    expect(selfConfirm.status()).toBe(403)

    // 3. Su coach ve el pago en recepción en Comprobantes y lo confirma.
    const coachPage = await login(browser, COACH)
    pages.push(coachPage)
    await coachPage.goto("/coach/payments", { waitUntil: "domcontentloaded" })
    await expect(coachPage.getByRole("heading", { level: 1, name: "Comprobantes" })).toBeVisible()
    const card = coachPage.locator('[data-slot="card"]').filter({ hasText: flow.memberEmail })
    await expect(card).toHaveCount(1)
    await expect(card.getByText(flow.memberName)).toBeVisible()
    await expect(card.getByText(CASH_PLAN_PRICE_TEXT)).toBeVisible()
    await expect(card.getByText("Efectivo", { exact: true })).toBeVisible()
    await expect(card.getByText(new RegExp(flow.planName))).toBeVisible()
    await expect(
      card.getByText("Pago en recepción: confírmalo cuando recibas el dinero")
    ).toBeVisible()
    await expect(card.getByRole("img", { name: "Comprobante de pago" })).toHaveCount(0)

    const [confirmed] = await Promise.all([
      coachPage.waitForResponse(pathIs(`/api/payments/${payment.id}`, "PUT")),
      card.getByRole("button", { name: "Confirmar pago" }).click(),
    ])
    expect(confirmed.status()).toBe(200)
    await expect(coachPage.getByText("Pago confirmado")).toBeVisible({ timeout: WRITE_TIMEOUT })
    await expect(card).toHaveCount(0)

    const done = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { membership: true },
    })
    expect(done.status).toBe("COMPLETED")
    expect(done.confirmedById).toBe(coach.id)
    expect(done.membership?.paymentConfirmed).toBe(true)
    expect(done.membership?.status).toBe("ACTIVE")
    expect(done.membership?.paymentMethod).toBe("CASH")
    expect(done.membership!.endDate.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000)

    const memberNotice = await prisma.notification.findFirst({
      where: { userId: member.id, title: "Pago confirmado" },
    })
    expect(memberNotice?.message).toBe("El gimnasio confirmó tu pago. ¡Tu membresía está activa!")

    // 4. El miembro ve su membresía activa y pagada, y ya puede reservar la clase.
    await openMembership(memberPage)
    await expect(memberPage.getByRole("heading", { level: 1, name: "Mi Membresía" })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Activa", { exact: true })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Pagado", { exact: true })).toBeVisible()
    await expect(
      memberPage.getByRole("main").getByText("Pendiente de confirmar en recepción")
    ).toHaveCount(0)

    const booked = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(booked.status()).toBe(201)
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
    await removeFixtures(flow)
  }
})
