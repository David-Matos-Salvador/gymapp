import { test, expect } from "@playwright/test"

const EMAIL = "carlos@gymapp.com"
const PASSWORD = "demo123"
const LOGIN_URL = "/login"

test.describe("Login hardening (F-01)", () => {
  test("el form SSR usa POST y bloquea el submit hasta montar", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
    const page = await context.newPage()

    try {
      await page.goto(LOGIN_URL)

      const form = page.locator("form")
      await expect(form).toHaveAttribute("method", "post")
      await expect(form).toHaveAttribute("action", LOGIN_URL)

      // Sin hidratar, ningún control es "successful": un submit nativo no puede
      // enviar email/password ni terminar en el query string.
      await expect(form.locator("fieldset")).toHaveAttribute("disabled", "")
      await expect(page.locator('input[type="email"]')).toBeDisabled()
      await expect(page.locator('input[type="password"]')).toBeDisabled()
      await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeDisabled()
    } finally {
      await context.close()
    }
  })

  test("login válido redirige al área autenticada", async ({ page }) => {
    await page.goto(LOGIN_URL)
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.getByRole("button", { name: /iniciar sesión/i }).click()

    await page.waitForURL(/\/(dashboard|my-routine)/)
  })

  test("credenciales inválidas muestran un error y no navegan", async ({ page }) => {
    await page.goto(LOGIN_URL)
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill("incorrecta")
    await page.getByRole("button", { name: /iniciar sesión/i }).click()

    await expect(page.getByText("Credenciales inválidas")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe("Progress charts (F-02)", () => {
  test("no emiten warnings de width/height al abrir /progress", async ({ page }) => {
    await page.goto(LOGIN_URL)
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.getByRole("button", { name: /iniciar sesión/i }).click()
    await page.waitForURL(/\/(dashboard|my-routine)/)

    const chartWarnings: string[] = []
    page.on("console", (message) => {
      if (
        message.type() === "warning" &&
        /width\(-?\d+\)|height\(-?\d+\)|should be greater than 0/i.test(message.text())
      ) {
        chartWarnings.push(message.text())
      }
    })

    await page.goto("/progress")
    await expect(page.getByRole("heading", { name: "Progreso" })).toBeVisible()
    await page.waitForTimeout(1_000)

    expect(chartWarnings).toEqual([])
  })
})
