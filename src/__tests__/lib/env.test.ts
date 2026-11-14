import { describe, it, expect } from "vitest"
import { EnvValidationError, validateEnv, type Env } from "@/lib/env"

const AUTH_SECRET = "a".repeat(32)

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: "postgresql://gymuser:gympassword@localhost:5432/gymdb?schema=public",
    AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    ...overrides,
  }
}

function validationError(env: Record<string, string | undefined>) {
  try {
    validateEnv(env)
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError)
    return error as EnvValidationError
  }
  throw new Error("Expected validateEnv to throw")
}

describe("validateEnv", () => {
  it("acepta una configuración válida y devuelve el objeto tipado", () => {
    const env: Env = validateEnv(baseEnv())

    expect(env.DATABASE_URL).toContain("postgresql://")
    expect(env.AUTH_SECRET).toBe(AUTH_SECRET)
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000")
    expect(env.AUTH_URL).toBeUndefined()
    expect(env.REDIS_URL).toBeUndefined()
    expect(env.AUTH_GOOGLE_ID).toBeUndefined()
  })

  it("acepta AUTH_URL como alternativa a NEXT_PUBLIC_APP_URL", () => {
    const env = validateEnv(
      baseEnv({ NEXT_PUBLIC_APP_URL: undefined, AUTH_URL: "https://gym.example.com" })
    )

    expect(env.AUTH_URL).toBe("https://gym.example.com")
    expect(env.NEXT_PUBLIC_APP_URL).toBeUndefined()
  })

  it("trata las variables opcionales vacías como ausentes", () => {
    const env = validateEnv(
      baseEnv({
        REDIS_URL: "",
        AUTH_GOOGLE_ID: "",
        AUTH_GOOGLE_SECRET: "",
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
      })
    )

    expect(env.REDIS_URL).toBeUndefined()
    expect(env.AUTH_GOOGLE_ID).toBeUndefined()
    expect(env.AUTH_GOOGLE_SECRET).toBeUndefined()
    expect(env.STRIPE_SECRET_KEY).toBeUndefined()
    expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined()
  })

  it("reporta las variables requeridas faltantes sin exponer valores", () => {
    const error = validationError({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" })

    expect(error.variables).toEqual(expect.arrayContaining(["DATABASE_URL", "AUTH_SECRET"]))
    expect(error.message).toContain("DATABASE_URL")
    expect(error.message).toContain("AUTH_SECRET")
    expect(error.message).not.toContain("postgresql://")
  })

  it("exige AUTH_URL o NEXT_PUBLIC_APP_URL", () => {
    const error = validationError(baseEnv({ NEXT_PUBLIC_APP_URL: undefined }))

    expect(error.variables).toEqual(expect.arrayContaining(["AUTH_URL", "NEXT_PUBLIC_APP_URL"]))
    expect(error.message).not.toContain("http")
  })

  it("rechaza un AUTH_SECRET de menos de 32 caracteres", () => {
    const error = validationError(baseEnv({ AUTH_SECRET: "short-secret" }))

    expect(error.variables).toContain("AUTH_SECRET")
    expect(error.message).not.toContain("short-secret")
  })

  it("rechaza URLs inválidas", () => {
    const error = validationError(baseEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" }))

    expect(error.variables).toContain("NEXT_PUBLIC_APP_URL")
  })

  it("rechaza un DATABASE_URL que no sea de PostgreSQL", () => {
    const error = validationError(baseEnv({ DATABASE_URL: "mysql://localhost:3306/gymdb" }))

    expect(error.variables).toContain("DATABASE_URL")
  })

  it("Google Calendar: exige las tres variables juntas y una llave de 32 bytes", () => {
    const key = Buffer.alloc(32, 7).toString("base64")
    const full = {
      GOOGLE_CALENDAR_CLIENT_ID: "calendar-client-id",
      GOOGLE_CALENDAR_CLIENT_SECRET: "calendar-client-secret",
      CALENDAR_TOKEN_ENCRYPTION_KEY: key,
    }
    expect(validateEnv(baseEnv(full)).GOOGLE_CALENDAR_CLIENT_ID).toBe("calendar-client-id")
    // Sin ninguna, la integración queda apagada y el ambiente es válido.
    expect(validateEnv(baseEnv()).GOOGLE_CALENDAR_CLIENT_ID).toBeUndefined()

    const partial = validationError(baseEnv({ GOOGLE_CALENDAR_CLIENT_ID: "calendar-client-id" }))
    expect(partial.variables).toEqual(
      expect.arrayContaining(["GOOGLE_CALENDAR_CLIENT_SECRET", "CALENDAR_TOKEN_ENCRYPTION_KEY"])
    )

    const shortKey = validationError(
      baseEnv({ ...full, CALENDAR_TOKEN_ENCRYPTION_KEY: "llave-corta" })
    )
    expect(shortKey.variables).toEqual(["CALENDAR_TOKEN_ENCRYPTION_KEY"])
    expect(shortKey.message).not.toContain("llave-corta")
    expect(shortKey.message).not.toContain("calendar-client-secret")
  })

  it("exige AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET juntas", () => {
    const error = validationError(baseEnv({ AUTH_GOOGLE_ID: "google-client-id" }))

    expect(error.variables).toEqual(
      expect.arrayContaining(["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"])
    )
    expect(error.message).not.toContain("google-client-id")
  })

  it("en producción exige HTTPS y rechaza localhost", () => {
    const error = validationError(
      baseEnv({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "http://localhost:3000" })
    )

    expect(error.variables).toContain("NEXT_PUBLIC_APP_URL")
  })

  it("en producción rechaza cualquier URL local aunque use HTTPS", () => {
    const error = validationError(
      baseEnv({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://localhost:3000" })
    )

    expect(error.variables).toContain("NEXT_PUBLIC_APP_URL")
  })

  it("en producción acepta una URL HTTPS pública", () => {
    const env = validateEnv(
      baseEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://gym.example.com",
      })
    )

    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://gym.example.com")
  })
})
