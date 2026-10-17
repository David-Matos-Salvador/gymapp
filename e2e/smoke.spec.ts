import { test, expect } from "@playwright/test"

test("landing page loads", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/GymApp/i)
})

test("login page is accessible", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator("form")).toBeVisible()
})

test("register page loads with mode selector", async ({ page }) => {
  await page.goto("/register")
  await expect(page.getByRole("button", { name: /Soy usuario/i })).toBeVisible()
})

test("health endpoint returns ok", async ({ request }) => {
  const response = await request.get("/api/health")
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.status).toBe("ok")
})
