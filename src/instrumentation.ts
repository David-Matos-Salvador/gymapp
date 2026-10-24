export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { validateEnv } = await import("./lib/env")

  try {
    validateEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment configuration"
    console.error(message)
    process.exit(1)
  }
}
