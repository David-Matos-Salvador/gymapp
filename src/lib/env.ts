import { z } from "zod"

const APP_URL_KEYS = ["AUTH_URL", "NEXT_PUBLIC_APP_URL"] as const

type EnvSource = Record<string, string | undefined>

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function urlSchema(allowedProtocols?: readonly string[]) {
  return z.string().superRefine((value, ctx) => {
    const parsed = parseUrl(value)
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: "Invalid URL" })
      return
    }

    if (allowedProtocols && !allowedProtocols.includes(parsed.protocol)) {
      ctx.addIssue({ code: "custom", message: "Invalid URL protocol" })
    }
  })
}

function optionalUrl(allowedProtocols?: readonly string[]) {
  return z.preprocess(emptyToUndefined, urlSchema(allowedProtocols).optional())
}

function optionalString() {
  return z.preprocess(emptyToUndefined, z.string().optional())
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized === "[::1]"
  )
}

const envObjectSchema = z.object({
  DATABASE_URL: urlSchema(["postgres:", "postgresql:"]),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: optionalUrl(["http:", "https:"]),
  NEXT_PUBLIC_APP_URL: optionalUrl(["http:", "https:"]),
  REDIS_URL: optionalUrl(["redis:", "rediss:"]),
  AUTH_GOOGLE_ID: optionalString(),
  AUTH_GOOGLE_SECRET: optionalString(),
  // Google Calendar del coach (free/busy). Las tres van juntas o ninguna.
  GOOGLE_CALENDAR_CLIENT_ID: optionalString(),
  GOOGLE_CALENDAR_CLIENT_SECRET: optionalString(),
  CALENDAR_TOKEN_ENCRYPTION_KEY: optionalString(),
  // Correos con Resend. Sin llave no se envían (se registra en el log).
  RESEND_API_KEY: optionalString(),
  EMAIL_FROM: optionalString(),
  STRIPE_SECRET_KEY: optionalString(),
  STRIPE_WEBHOOK_SECRET: optionalString(),
  // Recomendación de rutina con IA en el onboarding (#117). Sin llave se usa la regla normal.
  DEEPSEEK_API_KEY: optionalString(),
  S3_ENDPOINT: optionalUrl(["http:", "https:"]),
  S3_REGION: optionalString(),
  S3_BUCKET: optionalString(),
  S3_ACCESS_KEY_ID: optionalString(),
  S3_SECRET_ACCESS_KEY: optionalString(),
  S3_FORCE_PATH_STYLE: optionalString(),
})

export type Env = z.infer<typeof envObjectSchema>

export class EnvValidationError extends Error {
  readonly variables: string[]

  constructor(variables: string[]) {
    super(`Invalid environment configuration: ${variables.join(", ")}`)
    this.name = "EnvValidationError"
    this.variables = variables
  }
}

function createEnvSchema(isProduction: boolean) {
  return envObjectSchema.superRefine((env, ctx) => {
    if (!env.AUTH_URL && !env.NEXT_PUBLIC_APP_URL) {
      for (const key of APP_URL_KEYS) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "AUTH_URL or NEXT_PUBLIC_APP_URL is required",
        })
      }
    }

    if (isProduction) {
      for (const key of APP_URL_KEYS) {
        const value = env[key]
        if (!value) continue

        const parsed = parseUrl(value)
        if (!parsed) continue

        if (parsed.protocol !== "https:" || isLocalHostname(parsed.hostname)) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} must use HTTPS and must not point to localhost in production`,
          })
        }
      }
    }

    // Con S3_ENDPOINT los archivos van a SeaweedFS/S3: hacen falta el bucket y las credenciales.
    if (env.S3_ENDPOINT) {
      for (const key of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when S3_ENDPOINT is set`,
          })
        }
      }
    }

    const calendarKeys = [
      "GOOGLE_CALENDAR_CLIENT_ID",
      "GOOGLE_CALENDAR_CLIENT_SECRET",
      "CALENDAR_TOKEN_ENCRYPTION_KEY",
    ] as const
    if (calendarKeys.some((key) => env[key])) {
      for (const key of calendarKeys) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required to enable the Google Calendar integration`,
          })
        }
      }
      // La llave de cifrado debe ser de 32 bytes en base64 (openssl rand -base64 32).
      if (
        env.CALENDAR_TOKEN_ENCRYPTION_KEY &&
        Buffer.from(env.CALENDAR_TOKEN_ENCRYPTION_KEY.trim(), "base64").length !== 32
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["CALENDAR_TOKEN_ENCRYPTION_KEY"],
          message: "CALENDAR_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded in base64",
        })
      }
    }

    const hasGoogleId = Boolean(env.AUTH_GOOGLE_ID)
    const hasGoogleSecret = Boolean(env.AUTH_GOOGLE_SECRET)
    if (hasGoogleId !== hasGoogleSecret) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
        message: "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must be provided together",
      })
    }
  })
}

function collectVariables(error: z.ZodError): string[] {
  const variables = new Set<string>()

  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      variables.add("environment")
      continue
    }

    for (const segment of issue.path) {
      if (typeof segment === "string") variables.add(segment)
    }
  }

  return [...variables]
}

export function validateEnv(source: EnvSource = process.env): Env {
  const schema = createEnvSchema(source.NODE_ENV === "production")
  const result = schema.safeParse(source)

  if (!result.success) {
    throw new EnvValidationError(collectVariables(result.error))
  }

  return result.data
}
