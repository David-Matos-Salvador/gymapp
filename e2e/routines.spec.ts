import { test, expect, type Page } from '@playwright/test'

const EMAIL = 'carlos@gymapp.com'
const PASSWORD = 'demo123'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL(/\/rutinas/)
}

test.describe('Routines Flow', () => {

  test('view routines list after login', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/Hola,/i)).toBeVisible()
    await expect(page.getByText(/Mis entrenamientos/i)).toBeVisible()
  })

  test('split cards are visible in routines list', async ({ page }) => {
    await login(page)
    const splitCards = page.locator('button:has(p.font-medium)')
    await expect(splitCards.first()).toBeVisible()
  })

  test('weekly progress is displayed', async ({ page }) => {
    await login(page)
    await expect(page.getByText(/progreso semanal/i)).toBeVisible()
  })

  test('no routine assigned shows empty state for new user', async ({ page, request }) => {
    const uniqueEmail = `test-empty-${Date.now()}@gymapp.com`

    await request.post('/api/auth/register', {
      data: {
        name: 'Empty User',
        email: uniqueEmail,
        password: 'Test1234',
        role: 'MEMBER',
      },
    })

    await page.goto('/login')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', 'Test1234')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    await expect(page.getByText(/Sin rutina asignada|onboarding/i)).toBeVisible({ timeout: 10000 })
  })

  test('clicking a split card navigates to entrenar page', async ({ page }) => {
    await login(page)
    await page.locator('button:has(p.font-medium)').filter({ hasNot: page.locator('[disabled]') }).first().click()
    await expect(page).toHaveURL(/\/entrenar\//, { timeout: 10000 })
    await expect(page.getByRole('button', { name: /iniciar entrenamiento/i })).toBeVisible()
  })
})
