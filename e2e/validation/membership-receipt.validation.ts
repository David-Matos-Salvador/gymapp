import { test, expect, type Browser, type Page } from "@playwright/test"
import bcrypt from "bcryptjs"
import { findUser, prisma } from "./db"
import { SEED_PASSWORD } from "../seed-password"

/**
 * Pago de membresía con comprobante, de punta a punta (#23):
 * un miembro sin membresía elige un plan y sube su comprobante de Yape; la
 * membresía queda pendiente y todavía no le deja reservar. Otro coach y el
 * propio miembro no pueden confirmar ese pago; su coach sí, desde Comprobantes.
 * Después la membresía queda activa y pagada, y el miembro ya puede reservar.
 *
 * Todo lo que usa se crea en la corrida (miembro, plan y clase con nombres
 * únicos) y se borra al terminar: no toca a los usuarios ni los pagos del seed.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const PASSWORD = SEED_PASSWORD
const COACH = "trainer@gymapp.com"
const OTHER_COACH = "trainer2@gymapp.com"

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const MEMBER_EMAIL = `e2e-pago-${RUN}@gymapp.test`
const MEMBER_NAME = `Miembro Pago ${RUN}`
const PLAN_NAME = `Plan E2E ${RUN}`
const PLAN_PRICE = 87
// El formato de moneda puede llevar espacio duro entre S/ y el monto.
const PLAN_PRICE_TEXT = /S\/\s*87\.00/
const CLASS_NAME = `Clase E2E ${RUN}`
const RECEIPT_NAME = `comprobante-${RUN}.png`

// PNG de 1×1: basta para que el servidor lo acepte como imagen.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
  "base64"
)

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

/** Miembro, plan y clase propios de la corrida, en el gimnasio del coach del seed. */
async function createFixtures() {
  const coach = await findUser(COACH)
  if (!coach.gymId) throw new Error(`${COACH} no tiene gimnasio`)

  const member = await prisma.user.create({
    data: {
      email: MEMBER_EMAIL,
      name: MEMBER_NAME,
      password: await bcrypt.hash(PASSWORD, 10),
      role: "MEMBER",
      gymId: coach.gymId,
      assignedTrainerId: coach.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
  })
  const plan = await prisma.membershipPlan.create({
    data: { gymId: coach.gymId, name: PLAN_NAME, price: PLAN_PRICE, durationDays: 30 },
  })
  const classItem = await prisma.class.create({
    data: {
      gymId: coach.gymId,
      name: CLASS_NAME,
      trainerId: coach.id,
      capacity: 5,
      duration: 45,
      dayOfWeek: "SUNDAY",
      startTime: "07:00",
    },
  })

  return { coach, member, plan, classItem }
}

/** Borra lo creado por la corrida, aunque la prueba se haya cortado a medias. */
async function removeFixtures() {
  const member = await prisma.user.findUnique({ where: { email: MEMBER_EMAIL } })
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
  await prisma.class.deleteMany({ where: { name: CLASS_NAME } })
  await prisma.membershipPlan.deleteMany({ where: { name: PLAN_NAME } })
}

async function openMembership(page: Page) {
  // No se espera networkidle: la conexión de notificaciones en vivo (SSE) nunca queda quieta.
  // La hidratación se comprueba en cada paso que la necesita.
  await page.goto("/membresia", { waitUntil: "domcontentloaded" })
}

test("membresía con comprobante: el miembro paga, su coach confirma y la membresía queda activa", async ({
  browser,
}) => {
  const { coach, member, plan, classItem } = await createFixtures()
  const pages: Page[] = []

  try {
    const memberPage = await login(browser, MEMBER_EMAIL)
    pages.push(memberPage)

    // 1. Sin membresía, el miembro ve los planes de su gimnasio y no puede reservar.
    await openMembership(memberPage)
    await expect(
      memberPage.getByRole("heading", { level: 1, name: "Membresía", exact: true })
    ).toBeVisible()
    await expect(
      memberPage.getByRole("main").getByText("Aún no tienes una membresía activa.")
    ).toBeVisible()
    const noMembership = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(noMembership.status()).toBe(403)
    expect((await noMembership.json()).code).toBe("MEMBERSHIP_REQUIRED")

    // 2. Elige el plan de la corrida, paga con Yape y sube el comprobante.
    //    El nombre del archivo solo aparece cuando React ya está hidratado.
    const receiptInput = memberPage.locator("#newPaymentReceipt")
    await expect(async () => {
      await receiptInput.setInputFiles({
        name: RECEIPT_NAME,
        mimeType: "image/png",
        buffer: TINY_PNG,
      })
      await expect(memberPage.getByRole("main").getByText(RECEIPT_NAME)).toBeVisible({
        timeout: 5_000,
      })
    }).toPass({ intervals: [1_000, 2_000, 5_000], timeout: 90_000 })
    const planOption = memberPage.locator("label").filter({ hasText: PLAN_NAME })
    await planOption.click()
    await expect(planOption.getByRole("radio")).toBeChecked()
    await expect(planOption.getByText(PLAN_PRICE_TEXT)).toBeVisible()
    await memberPage.locator("#newPaymentMethod").selectOption("YAPE")

    const [created] = await Promise.all([
      memberPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/payments" &&
          response.request().method() === "POST"
      ),
      memberPage.getByRole("button", { name: "Enviar comprobante" }).click(),
    ])
    expect(created.status()).toBe(201)
    const { payment } = (await created.json()) as { payment: { id: string } }
    await expect(
      memberPage.getByText("Comprobante enviado. El gimnasio lo revisará.")
    ).toBeVisible()

    // 3. La membresía queda pendiente: comprobante en revisión, sin confirmar.
    await openMembership(memberPage)
    await expect(memberPage.getByRole("heading", { level: 1, name: "Mi Membresía" })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText(PLAN_NAME)).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Comprobante en revisión")).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Pago pendiente").first()).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Pagado", { exact: true })).toHaveCount(0)

    const pending = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { membership: true },
    })
    expect(pending.status).toBe("PENDING")
    expect(pending.method).toBe("YAPE")
    expect(Number(pending.amount)).toBe(PLAN_PRICE)
    expect(pending.receiptUrl).toBeTruthy()
    expect(pending.membership?.planId).toBe(plan.id)
    expect(pending.membership?.paymentConfirmed).toBe(false)

    // El coach asignado recibe el aviso del comprobante nuevo.
    const coachNotice = await prisma.notification.findFirst({
      where: { userId: coach.id, metadata: { path: ["paymentId"], equals: payment.id } },
    })
    expect(coachNotice?.title).toBe("Nuevo comprobante de pago")

    // Con el pago pendiente sigue sin poder reservar.
    const stillPending = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(stillPending.status()).toBe(403)

    // 4. Permisos: el miembro no puede confirmar su propio pago, y un coach que no es
    //    el suyo ni lo ve en su bandeja ni lo puede confirmar.
    //    Primero una navegación de calentamiento, para que la ruta ya esté compilada.
    await memberPage.request.get(`/api/payments/${payment.id}`)
    const selfConfirm = await memberPage.request.put(`/api/payments/${payment.id}`, {
      data: { action: "CONFIRM" },
    })
    expect(selfConfirm.status()).toBe(403)

    const otherCoachPage = await login(browser, OTHER_COACH)
    pages.push(otherCoachPage)
    const otherInbox = await otherCoachPage.request.get("/api/payments/pending")
    expect(otherInbox.status()).toBe(200)
    const { payments: otherPayments } = (await otherInbox.json()) as {
      payments: Array<{ id: string }>
    }
    expect(otherPayments.map((item) => item.id)).not.toContain(payment.id)
    const otherConfirm = await otherCoachPage.request.put(`/api/payments/${payment.id}`, {
      data: { action: "CONFIRM" },
    })
    expect(otherConfirm.status()).toBe(403)
    expect((await otherConfirm.json()).error).toBe("Solo puedes gestionar pagos de tus clientes")
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      "PENDING"
    )

    // 5. Su coach ve el comprobante en Comprobantes y confirma el pago.
    const coachPage = await login(browser, COACH)
    pages.push(coachPage)
    await coachPage.goto("/coach/payments", { waitUntil: "domcontentloaded" })
    await expect(coachPage.getByRole("heading", { level: 1, name: "Comprobantes" })).toBeVisible()
    const card = coachPage.locator('[data-slot="card"]').filter({ hasText: MEMBER_EMAIL })
    await expect(card).toHaveCount(1)
    await expect(card.getByText(MEMBER_NAME)).toBeVisible()
    await expect(card.getByText(PLAN_PRICE_TEXT)).toBeVisible()
    await expect(card.getByText("Yape", { exact: true })).toBeVisible()
    await expect(card.getByText(new RegExp(PLAN_NAME))).toBeVisible()
    await expect(card.getByRole("img", { name: "Comprobante de pago" })).toBeVisible()

    const [confirmed] = await Promise.all([
      coachPage.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/api/payments/${payment.id}` &&
          response.request().method() === "PUT"
      ),
      card.getByRole("button", { name: "Confirmar pago" }).click(),
    ])
    expect(confirmed.status()).toBe(200)
    await expect(coachPage.getByText("Pago confirmado")).toBeVisible()
    await expect(card).toHaveCount(0)

    // Un segundo intento sobre el mismo pago no lo vuelve a procesar.
    const again = await coachPage.request.put(`/api/payments/${payment.id}`, {
      data: { action: "CONFIRM" },
    })
    expect(again.status()).toBe(409)

    const done = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { membership: true },
    })
    expect(done.status).toBe("COMPLETED")
    expect(done.confirmedById).toBe(coach.id)
    expect(done.membership?.paymentConfirmed).toBe(true)
    expect(done.membership?.status).toBe("ACTIVE")
    expect(done.membership?.paymentMethod).toBe("YAPE")
    expect(done.membership!.endDate.getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000)

    const memberNotice = await prisma.notification.findFirst({
      where: { userId: member.id, title: "Pago confirmado" },
    })
    expect(memberNotice?.message).toBe(
      "Tu comprobante de pago fue verificado. ¡Tu membresía está activa!"
    )

    // 6. El miembro ve su membresía activa y pagada, y ya puede reservar la clase.
    await openMembership(memberPage)
    await expect(memberPage.getByRole("heading", { level: 1, name: "Mi Membresía" })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Activa", { exact: true })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Pagado", { exact: true })).toBeVisible()
    await expect(memberPage.getByRole("main").getByText("Comprobante en revisión")).toHaveCount(0)
    await expect(memberPage.getByRole("main").getByText("Pago pendiente")).toHaveCount(0)

    const booked = await memberPage.request.post("/api/bookings", {
      data: { classId: classItem.id },
    })
    expect(booked.status()).toBe(201)
  } finally {
    await Promise.all(pages.map((page) => page.context().close()))
    await removeFixtures()
  }
})
