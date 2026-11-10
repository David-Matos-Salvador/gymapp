import { test, expect, type Browser, type Locator, type Page } from "@playwright/test"

/**
 * Agenda 1:1: el coach define sus horas, un cliente reserva, otro cliente ya
 * no puede tomar esa hora, y al cancelar la hora vuelve a quedar libre.
 *
 * Usa el domingo porque el seed no le pone horas ni clases al coach ese día:
 * así el resultado no depende de la fecha en que corre la prueba. Al terminar
 * deja la agenda como la encontró.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const PASSWORD = "demo123"
const COACH = "trainer@gymapp.com"
const CLIENT_A = "carlos@gymapp.com"
const CLIENT_B = "ana@gymapp.com"

test.describe.configure({ mode: "serial" })
test.setTimeout(5 * 60_000)

async function login(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.waitForTimeout(300)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole("button", { name: /iniciar sesión/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 25_000 })
  return page
}

/** Tarjeta del domingo más lejano dentro de la ventana de reserva: siempre está en el futuro. */
function lastSunday(page: Page) {
  return page
    .locator('[data-testid^="slots-"]')
    .filter({ hasText: /domingo/i })
    .last()
}

/** Botón de una hora dentro de una tarjeta de día. Su nombre accesible es "Reservar el … a las HH:mm". */
function slotButton(card: Locator, time: string) {
  return card.getByRole("button", { name: new RegExp(`a las ${time}$`) })
}

async function openSessions(page: Page) {
  await page.goto("/sessions", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Sesiones 1:1" })).toBeVisible()
}

async function openSchedule(page: Page) {
  await page.goto("/coach/schedule", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: "Mi agenda" })).toBeVisible()
  // Margen para la hidratación: antes de eso los botones todavía no responden.
  await page.waitForTimeout(700)
}

/** Quita las horas del domingo si las hay: el estado que deja el seed. */
async function clearSunday(page: Page) {
  await openSchedule(page)
  const remove = page.getByRole("button", { name: "Quitar horas del domingo" })
  const count = await remove.count()
  if (count === 0) return
  for (let i = 0; i < count; i++) await remove.first().click()
  await expect(remove).toHaveCount(0)
  await page.getByRole("button", { name: "Guardar horas de atención" }).click()
  await expect(page.getByText("Horas de atención guardadas")).toBeVisible()
}

test("agenda 1:1: el coach abre horas, un cliente reserva y la hora queda bloqueada", async ({
  browser,
}) => {
  const coach = await login(browser, COACH)
  const clientA = await login(browser, CLIENT_A)
  const clientB = await login(browser, CLIENT_B)

  try {
    // 1. El coach agrega horas el domingo (09:00 a 12:00 por defecto) y guarda.
    //    Primero limpia el domingo, por si una corrida anterior se interrumpió.
    await clearSunday(coach)
    await openSchedule(coach)
    const sunday = coach.getByTestId("availability-SUNDAY")
    await expect(sunday.getByText("No atiendes este día")).toBeVisible()
    await sunday.getByRole("button", { name: "Agregar horas el domingo" }).click()
    await expect(sunday.getByLabel("Desde, domingo")).toHaveValue("09:00")
    await expect(sunday.getByLabel("Hasta, domingo")).toHaveValue("12:00")
    await coach.getByRole("button", { name: "Guardar horas de atención" }).click()
    await expect(coach.getByText("Horas de atención guardadas")).toBeVisible()

    // 2. El cliente A ve las tres horas del domingo y reserva la de las 09:00.
    await openSessions(clientA)
    const sundayA = lastSunday(clientA)
    for (const time of ["09:00", "10:00", "11:00"]) {
      await expect(slotButton(sundayA, time)).toBeVisible()
    }
    const [bookingResponse] = await Promise.all([
      clientA.waitForResponse(
        (response) =>
          response.url().endsWith("/api/appointments") && response.request().method() === "POST"
      ),
      slotButton(sundayA, "09:00").click(),
    ])
    expect(bookingResponse.status()).toBe(201)
    const { startsAt } = bookingResponse.request().postDataJSON() as { startsAt: string }
    await expect(clientA.getByText("Sesión reservada")).toBeVisible()
    const mine = clientA.getByTestId("appointment-list")
    await expect(mine.getByText(/domingo.*09:00/i)).toBeVisible()
    await expect(mine.getByText(/Con Coach Martínez/)).toBeVisible()

    // 3. El cliente B ya no ve las 09:00, y la API rechaza esa misma hora.
    await openSessions(clientB)
    const sundayB = lastSunday(clientB)
    await expect(slotButton(sundayB, "10:00")).toBeVisible()
    await expect(slotButton(sundayB, "09:00")).toHaveCount(0)
    const conflict = await clientB.request.post("/api/appointments", { data: { startsAt } })
    expect(conflict.status()).toBe(409)
    expect((await conflict.json()).error).toBe("Esa hora ya no está disponible. Elige otra.")

    // 4. El coach ve la sesión en su agenda y la cancela.
    await openSchedule(coach)
    const sessions = coach.getByTestId("appointment-list")
    await expect(sessions.getByText(/Con Carlos Rodríguez/)).toBeVisible()
    await sessions.getByRole("button", { name: /Cancelar la sesión del domingo/i }).click()
    await expect(coach.getByText("Sesión cancelada")).toBeVisible()
    await expect(coach.getByText("Todavía no tienes sesiones reservadas")).toBeVisible()

    // 5. La hora vuelve a estar libre para el cliente B.
    await openSessions(clientB)
    await expect(slotButton(lastSunday(clientB), "09:00")).toBeVisible()

    // 6. Si los dos clientes piden esa hora al mismo tiempo, solo uno la consigue.
    const race = await Promise.all(
      [clientA, clientB].map((page) =>
        page.request.post("/api/appointments", { data: { startsAt } })
      )
    )
    expect(race.map((response) => response.status()).sort()).toEqual([201, 409])
    const winner = race[0].status() === 201 ? 0 : 1
    const { appointment } = (await race[winner].json()) as { appointment: { id: string } }
    const cancel = await [clientA, clientB][winner].request.patch(
      `/api/appointments/${appointment.id}`,
      { data: { status: "CANCELLED" } }
    )
    expect(cancel.status()).toBe(200)
  } finally {
    // Deja la agenda del coach como la dejó el seed: sin horas el domingo.
    await clearSunday(coach)
    await Promise.all([coach, clientA, clientB].map((page) => page.context().close()))
  }
})
