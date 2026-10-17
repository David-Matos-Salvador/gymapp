import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e/validation",
  testMatch: "**/*.validation.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 20 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [["line"]],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
