import { test, expect } from "@playwright/test"

const SEED_EMAIL = "carlos@gymapp.com"
const PWD_INPUT = "#password"
const CONFIRM_INPUT = "#confirmPassword"
const ts = () => Date.now()

test.describe("Register page — mode selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register")
  })

  test("shows all three mode options", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Soy usuario/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Soy entrenador/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Soy dueño/i })).toBeVisible()
  })

  test("has link to login page", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Inicia sesión/i })).toBeVisible()
  })
})

test.describe("Register form — member mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register")
    await page.getByRole("button", { name: /Soy usuario/i }).click()
  })

  test("shows form with correct heading", async ({ page }) => {
    await expect(page.getByText(/Registrate como usuario/i)).toBeVisible()
    await expect(page.getByLabel("Nombre")).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.locator(PWD_INPUT)).toBeVisible()
    await expect(page.locator(CONFIRM_INPUT)).toBeVisible()
  })

  test("does NOT show gym fields for member", async ({ page }) => {
    await expect(page.getByLabel(/Nombre del gimnasio/)).not.toBeVisible()
  })

  test("shows Google sign-in button for member", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Continuar con Google/i })).toBeVisible()
  })

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/2 caracteres/i)).toBeVisible()
  })

  test("shows password strength indicator when typing", async ({ page }) => {
    await page.locator(PWD_INPUT).fill("abc")
    await expect(page.getByText(/8 caracteres/i)).toBeVisible()
    await expect(page.getByText(/1 mayúscula/i)).toBeVisible()
    await expect(page.getByText(/1 número/i)).toBeVisible()
  })

  test("password checks turn green when requirements met", async ({ page }) => {
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await expect(page.getByText("8 caracteres mínimo")).toBeVisible()
    await expect(page.getByText("1 mayúscula")).toBeVisible()
    await expect(page.getByText("1 número")).toBeVisible()
  })

  test("shows password mismatch error", async ({ page }) => {
    await page.getByLabel("Nombre").fill("Test User")
    await page.getByLabel("Email").fill(`test-${ts()}@test.com`)
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await page.locator(CONFIRM_INPUT).fill("Different1")
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/no coinciden/i)).toBeVisible()
  })

  test("shows email already registered error", async ({ page }) => {
    await page.getByLabel("Nombre").fill("Test")
    await page.getByLabel("Email").fill(SEED_EMAIL)
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await page.locator(CONFIRM_INPUT).fill("Abcdefg1")
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/ya esta registrado/i)).toBeVisible()
  })

  test("successful member registration shows success view", async ({ page }) => {
    const uniqueEmail = `member-${ts()}@test.com`
    await page.getByLabel("Nombre").fill("Test Member")
    await page.getByLabel("Email").fill(uniqueEmail)
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await page.locator(CONFIRM_INPUT).fill("Abcdefg1")
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/Cuenta creada/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Register form — trainer mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register")
    await page.getByRole("button", { name: /Soy entrenador/i }).click()
  })

  test("shows form with correct heading", async ({ page }) => {
    await expect(page.getByText(/Registrate como entrenador/i)).toBeVisible()
  })

  test("does NOT show gym fields for trainer", async ({ page }) => {
    await expect(page.getByLabel(/Nombre del gimnasio/)).not.toBeVisible()
  })

  test("shows Google sign-in button for trainer", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Continuar con Google/i })).toBeVisible()
  })

  test("successful trainer registration shows success view", async ({ page }) => {
    const uniqueEmail = `trainer-${ts()}@test.com`
    await page.getByLabel("Nombre").fill("Test Trainer")
    await page.getByLabel("Email").fill(uniqueEmail)
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await page.locator(CONFIRM_INPUT).fill("Abcdefg1")
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/Cuenta creada/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Register form — gym owner mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register")
    await page.getByRole("button", { name: /Soy dueño/i }).click()
  })

  test("shows form with correct heading", async ({ page }) => {
    await expect(page.getByText(/Registrate como dueño de gym/i)).toBeVisible()
  })

  test("shows gym name and address fields", async ({ page }) => {
    await expect(page.getByLabel(/Nombre del gimnasio/)).toBeVisible()
    await expect(page.getByLabel(/Direccion/)).toBeVisible()
  })

  test("Google sign-in is hidden for gym owner", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Continuar con Google/i })).not.toBeVisible()
  })

  test("gym name field is required", async ({ page }) => {
    await page.locator("#name").fill("Test Owner")
    await page.getByLabel("Email").fill(`gym-${ts()}@test.com`)
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await page.locator(CONFIRM_INPUT).fill("Abcdefg1")
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/Nombre del gimnasio debe tener/i)).toBeVisible()
  })

  test("password strength indicator appears", async ({ page }) => {
    await page.locator(PWD_INPUT).fill("Ab1")
    await expect(page.getByText(/8 caracteres/i)).toBeVisible()
  })

  test("successful gym owner registration shows success view", async ({ page }) => {
    const uniqueEmail = `gym-owner-${ts()}@test.com`
    const uniqueGym = `Gym Test ${ts()}`
    await page.locator("#name").fill("Test Gym Owner")
    await page.getByLabel("Email").fill(uniqueEmail)
    await page.getByLabel(/Nombre del gimnasio/).fill(uniqueGym)
    await page.getByLabel(/Direccion/).fill("Test Address 123")
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await page.locator(CONFIRM_INPUT).fill("Abcdefg1")
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/Cuenta creada/i)).toBeVisible({ timeout: 10000 })
  })

  test("duplicate gym name shows error", async ({ page }) => {
    await page.locator("#name").fill("Test Owner")
    await page.getByLabel("Email").fill(`gym-dup-${ts()}@test.com`)
    await page.getByLabel(/Nombre del gimnasio/).fill("Fitness Total")
    await page.locator(PWD_INPUT).fill("Abcdefg1")
    await page.locator(CONFIRM_INPUT).fill("Abcdefg1")
    await page.getByRole("button", { name: /Crear cuenta/i }).click()
    await expect(page.getByText(/Ya existe un gimnasio/i)).toBeVisible()
  })
})

test.describe("Register form — navigation", () => {
  test('"Cambiar modo" returns to mode selection', async ({ page }) => {
    await page.goto("/register")
    await page.getByRole("button", { name: /Soy usuario/i }).click()
    await expect(page.locator("#name")).toBeVisible()
    await page.getByText(/Cambiar modo/).click()
    await expect(page.getByRole("button", { name: /Soy usuario/i })).toBeVisible()
  })

  test("mode selection cards survive back navigation", async ({ page }) => {
    await page.goto("/register")
    await page.getByRole("button", { name: /Soy entrenador/i }).click()
    await page.getByText(/Cambiar modo/).click()
    await expect(page.getByRole("button", { name: /Soy dueño/i })).toBeVisible()
  })
})
