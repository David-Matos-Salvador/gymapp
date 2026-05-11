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

test.describe('Workout Flow', () => {

  test('sets and weights are NOT editable before clicking play', async ({ page }) => {
    await login(page)
    await page.locator('button:has(p.font-medium)').filter({ hasNot: page.locator('[disabled]') }).first().click()
    await page.waitForURL(/\/entrenar\//)
    await expect(page.getByRole('button', { name: /iniciar entrenamiento/i })).toBeVisible()
    await expect(page.getByText('kg')).not.toBeVisible()
  })

  test('full workout flow: login → entrenar → complete → celebrate', async ({ page }) => {
    await login(page)
    await page.locator('button:has(p.font-medium)').filter({ hasNot: page.locator('[disabled]') }).first().click()
    await page.waitForURL(/\/entrenar\//)

    await page.getByRole('button', { name: /iniciar entrenamiento/i }).click()
    await page.waitForTimeout(1000)

    for (let ex = 0; ex < 5; ex++) {
      const setPrefixes = ['1 ', '2 ', '3 ', '4 ', '5 ']
      let clicked = 0
      for (const prefix of setPrefixes) {
        const btn = page.getByRole('button', { name: new RegExp('^' + prefix) })
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await btn.click()
          await page.waitForTimeout(150)
          clicked++
        }
      }
      if (clicked === 0) break

      const skipBtn = page.getByRole('button', { name: /^saltar$/i })
      if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await skipBtn.click()
        await page.waitForTimeout(500)
      }
    }

    const finishBtn = page.getByRole('button', { name: /finalizar entrenamiento/i })
    if (await finishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await finishBtn.click()
    }

    await page.waitForTimeout(2000)

    const irBtn = page.locator('button, a').filter({ hasText: /ir al inicio|Volver/i })
    if (await irBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await irBtn.first().click()
    }

    await page.waitForURL(/\/rutinas/, { timeout: 5000 })
  })

  test('all splits unlocked after workout completion', async ({ page }) => {
    await login(page)
    await page.locator('button:has(p.font-medium)').filter({ hasNot: page.locator('[disabled]') }).first().click()
    await page.waitForURL(/\/entrenar\//)

    await page.getByRole('button', { name: /iniciar entrenamiento/i }).click()
    await page.waitForTimeout(1000)

    for (let ex = 0; ex < 5; ex++) {
      const setPrefixes = ['1 ', '2 ', '3 ', '4 ', '5 ']
      let clicked = 0
      for (const prefix of setPrefixes) {
        const btn = page.getByRole('button', { name: new RegExp('^' + prefix) })
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await btn.click()
          await page.waitForTimeout(150)
          clicked++
        }
      }
      if (clicked === 0) break

      const skipBtn = page.getByRole('button', { name: /^saltar$/i })
      if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await skipBtn.click()
        await page.waitForTimeout(500)
      }
    }

    const finishBtn = page.getByRole('button', { name: /finalizar entrenamiento/i })
    if (await finishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await finishBtn.click()
    }

    await page.waitForTimeout(2000)

    const irBtn = page.locator('button, a').filter({ hasText: /ir al inicio|Volver/i })
    if (await irBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await irBtn.first().click()
    }

    await page.waitForURL(/\/rutinas/, { timeout: 5000 })

    const disabled = page.locator('button[disabled]:has(p.font-medium)')
    await expect(disabled).toHaveCount(0)
  })
})
