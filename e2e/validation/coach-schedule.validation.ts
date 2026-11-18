import { test, expect, type Browser, type Locator, type Page } from "@playwright/test"
import { findUser, prisma } from "./db"

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

// El servidor de desarrollo de la CI a veces recompila justo en ese segundo y corta la conexión
// («read ECONNRESET», #164). Ese corte no es una respuesta de la API: se reintenta una vez.
async function postAppointment(page: Page, startsAt: string) {
  const send = () => page.request.post("/api/appointments", { data: { startsAt } })
  try {
    return await send()
  } catch (error) {
    if (!String(error).includes("ECONNRESET")) throw error
    return send()
  }
}

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
    // Reservar pregunta antes (#109): si dice que no, no se reserva nada; si dice que sí, se reserva.
    const bookingQuestions: string[] = []
    clientA.once("dialog", (dialog) => {
      bookingQuestions.push(dialog.message())
      void dialog.dismiss()
    })
    await slotButton(sundayA, "09:00").click()
    await expect
      .poll(() => bookingQuestions[0])
      .toMatch(/¿Reservar sesión con Coach Martínez el domingo.* a las 09:00\?/)
    await expect(slotButton(sundayA, "09:00")).toBeVisible()
    await expect(clientA.getByText("Sesión reservada")).toHaveCount(0)
    clientA.once("dialog", (dialog) => void dialog.accept())
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
    const conflict = await postAppointment(clientB, startsAt)
    expect(conflict.status()).toBe(409)
    expect((await conflict.json()).error).toBe("Esa hora ya no está disponible. Elige otra.")

    // 4. El coach ve la sesión en su agenda. Cancelar pregunta antes: si dice que no,
    //    la sesión sigue; si dice que sí, se cancela.
    await openSchedule(coach)
    const sessions = coach.getByTestId("appointment-list")
    await expect(sessions.getByText(/Con Carlos Rodríguez/)).toBeVisible()
    const cancelButton = sessions.getByRole("button", { name: /Cancelar la sesión del domingo/i })
    const questions: string[] = []
    coach.once("dialog", (dialog) => {
      questions.push(dialog.message())
      void dialog.dismiss()
    })
    await cancelButton.click()
    await expect
      .poll(() => questions[0])
      .toMatch(/¿Cancelar la sesión del domingo.*con Carlos Rodríguez\? Se le avisará\./)
    await expect(sessions.getByText(/Con Carlos Rodríguez/)).toBeVisible()
    coach.once("dialog", (dialog) => void dialog.accept())
    await cancelButton.click()
    await expect(coach.getByText("Sesión cancelada")).toBeVisible()
    await expect(coach.getByText("Todavía no tienes sesiones reservadas")).toBeVisible()

    // 5. La hora vuelve a estar libre para el cliente B.
    await openSessions(clientB)
    await expect(slotButton(lastSunday(clientB), "09:00")).toBeVisible()

    // 6. Si los dos clientes piden esa hora al mismo tiempo, solo uno la consigue.
    const race = await Promise.all(
      [clientA, clientB].map((page) => postAppointment(page, startsAt))
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

/** Conexión de calendario del coach y sus bloqueos, directo en la base. */
async function removeCalendarConnection(trainerId: string) {
  await prisma.coachCalendarConnection.deleteMany({ where: { trainerId } })
}

test("agenda 1:1: una hora ocupada en el calendario externo del coach no se puede reservar", async ({
  browser,
}) => {
  // Google no se puede usar en CI: la conexión y su caché se siembran en la base, recién
  // sincronizadas, así la app no intenta hablar con Google. El flujo OAuth y la lectura
  // de free/busy se prueban con mocks en los tests unitarios.
  const trainer = await findUser(COACH)
  const coach = await login(browser, COACH)
  const client = await login(browser, CLIENT_A)

  try {
    await removeCalendarConnection(trainer.id)
    await clearSunday(coach)
    await openSchedule(coach)
    const sunday = coach.getByTestId("availability-SUNDAY")
    await sunday.getByRole("button", { name: "Agregar horas el domingo" }).click()
    await expect(sunday.getByLabel("Desde, domingo")).toHaveValue("09:00")
    await coach.getByRole("button", { name: "Guardar horas de atención" }).click()
    await expect(coach.getByText("Horas de atención guardadas")).toBeVisible()

    // 1. Sin calendario conectado, el coach ve la opción de conectar y el cliente ve las 10:00.
    const card = coach.getByTestId("calendar-connection")
    await expect(card.getByText("Sin conectar")).toBeVisible()
    await expect(card.getByRole("link", { name: "Conectar Google Calendar" })).toHaveAttribute(
      "href",
      "/api/coach/calendar/connect"
    )
    await openSessions(client)
    await expect(slotButton(lastSunday(client), "10:00")).toBeVisible()

    // 2. El calendario del coach dice que está ocupado ese domingo de 10:00 a 11:00.
    const slotsResponse = await client.request.get("/api/appointments/slots")
    const { slots } = (await slotsResponse.json()) as {
      slots: Array<{ startsAt: string; date: string; time: string }>
    }
    const lastDate = slots.filter((slot) => slot.time === "10:00").at(-1)!.date
    const blocked = slots.find((slot) => slot.date === lastDate && slot.time === "10:00")!
    const blockedStart = new Date(blocked.startsAt)
    await prisma.coachCalendarConnection.create({
      data: {
        trainerId: trainer.id,
        // Valor de relleno: no es un token real y la app no lo puede descifrar.
        encryptedRefreshToken: "v1.e2e.e2e.e2e",
        lastSyncAt: new Date(),
        busyBlocks: {
          create: {
            startsAt: blockedStart,
            endsAt: new Date(blockedStart.getTime() + 60 * 60_000),
          },
        },
      },
    })

    // 3. El cliente ya no ve las 10:00 (sí las de al lado) y la API la rechaza.
    await openSessions(client)
    const sundayCard = client.getByTestId(`slots-${lastDate}`)
    await expect(slotButton(sundayCard, "09:00")).toBeVisible()
    await expect(slotButton(sundayCard, "11:00")).toBeVisible()
    await expect(slotButton(sundayCard, "10:00")).toHaveCount(0)
    const conflict = await client.request.post("/api/appointments", {
      data: { startsAt: blocked.startsAt },
    })
    expect(conflict.status()).toBe(409)

    // 4. El coach ve su calendario conectado y lo desconecta.
    await openSchedule(coach)
    await expect(card.getByText("Conectado", { exact: true })).toBeVisible()
    await expect(card.getByText(/1 bloqueo en los próximos días/)).toBeVisible()
    coach.once("dialog", (dialog) => void dialog.accept())
    await card.getByRole("button", { name: "Desconectar" }).click()
    await expect(coach.getByText("Calendario desconectado")).toBeVisible()
    await expect(card.getByText("Sin conectar")).toBeVisible()
    // La credencial y la caché ya no están en la base.
    expect(await prisma.coachCalendarConnection.count({ where: { trainerId: trainer.id } })).toBe(0)
    expect(await prisma.calendarBusyBlock.count()).toBe(0)

    // 5. La hora vuelve a ofrecerse.
    await openSessions(client)
    await expect(slotButton(client.getByTestId(`slots-${lastDate}`), "10:00")).toBeVisible()
  } finally {
    await removeCalendarConnection(trainer.id)
    await clearSunday(coach)
    await Promise.all([coach, client].map((page) => page.context().close()))
  }
})
