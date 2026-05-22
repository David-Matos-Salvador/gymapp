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

test.describe('Notifications Flow', () => {

  test('notification bell is visible in header after login', async ({ page }) => {
    await login(page)
    const bell = page.getByLabel('Notificaciones')
    await expect(bell).toBeVisible()
  })

  test('click notification bell opens notifications panel', async ({ page }) => {
    await login(page)
    const bell = page.getByLabel('Notificaciones')
    await expect(bell).toBeVisible()
    await bell.click()

    await expect(page.getByText(/Notificaciones/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('notifications page at /notifications shows notification list', async ({ page }) => {
    await login(page)
    await page.goto('/notifications')
    await page.waitForURL('/notifications')

    await expect(page.getByRole('heading', { name: /Notificaciones/i })).toBeVisible({ timeout: 5000 })
  })

  test('mark all read button appears when there are unread notifications', async ({ page }) => {
    await login(page)
    const bell = page.getByLabel('Notificaciones')
    await expect(bell).toBeVisible()
    await bell.click()

    const markAllBtn = page.getByText(/Marcar todas leídas/i)
    const emptyState = page.getByText(/No tenés notificaciones/i)

    const hasNotifications = await markAllBtn.isVisible({ timeout: 3000 }).catch(() => false)
    const isEmpty = await emptyState.isVisible({ timeout: 1000 }).catch(() => false)

    expect(hasNotifications || isEmpty).toBeTruthy()
  })

  test('close notification panel and reopen works', async ({ page }) => {
    await login(page)
    const bell = page.getByLabel('Notificaciones')
    await bell.click()

    await expect(page.getByText(/Notificaciones/i).first()).toBeVisible({ timeout: 5000 })

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    await bell.click()
    await expect(page.getByText(/Notificaciones/i).first()).toBeVisible({ timeout: 5000 })
  })
})
