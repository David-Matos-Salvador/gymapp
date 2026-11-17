import { test, expect, type Page } from "@playwright/test"

const EMAIL = "carlos@gymapp.com"
const PASSWORD = "demo123"

async function login(page: Page) {
  await page.goto("/login")
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole("button", { name: /iniciar sesión/i }).click()
  await page.waitForURL(/\/my-routine/)
}

test.describe("Auth flows", () => {
  test("register page shows mode selector and allows selecting a mode", async ({ page }) => {
    await page.goto("/register")
    await expect(page.getByRole("button", { name: /Soy usuario/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Soy entrenador/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Soy dueño/i })).toBeVisible()

    await page.getByRole("button", { name: /Soy usuario/i }).click()
    await expect(page.getByLabel("Nombre")).toBeVisible()
    await expect(page.getByLabel("Correo")).toBeVisible()
    await expect(page.getByLabel(/Contraseña/).first()).toBeVisible()

    await expect(page.getByText(/Registrate como usuario/i)).toBeVisible()
  })

  test("register form shows validation errors with empty submission", async ({ page }) => {
    await page.goto("/register")
    await page.getByRole("button", { name: /Soy usuario/i }).click()

    await page.getByRole("button", { name: /Crear cuenta/i }).click()

    await expect(page.getByText(/2 caracteres/i)).toBeVisible()
  })

  test("login shows error with wrong password", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[type="email"]', "carlos@gymapp.com")
    await page.fill('input[type="password"]', "wrongpassword123")
    await page.getByRole("button", { name: /iniciar sesión/i }).click()

    await expect(page.getByText(/Credenciales inválidas/i)).toBeVisible()
  })

  test("login redirects to my-routine after successful login", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/my-routine/)
    await expect(page.getByText(/Hola,/i)).toBeVisible()
  })

  test("login page has link to register and Google login", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("link", { name: /Crear cuenta/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Continuar con Google/i })).toBeVisible()
  })

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register")
    await expect(page.getByRole("link", { name: /Inicia sesión/i })).toBeVisible()
  })
})
