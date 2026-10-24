import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { validateEnv } from "../src/lib/env"

const nodeEnv = process.env.NODE_ENV ?? "development"
const envFiles = [`.env.${nodeEnv}.local`, ".env.local", `.env.${nodeEnv}`, ".env"]

for (const file of envFiles) {
  const path = resolve(process.cwd(), file)
  if (existsSync(path)) process.loadEnvFile(path)
}

try {
  validateEnv()
  console.log("✅ Environment variables are valid")
} catch (error) {
  const message = error instanceof Error ? error.message : "Invalid environment configuration"
  console.error(`❌ ${message}`)
  process.exit(1)
}
