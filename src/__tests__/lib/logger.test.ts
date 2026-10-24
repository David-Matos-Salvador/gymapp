import { describe, expect, it } from "vitest"
import {
  createLogger,
  redactString,
  sanitizeContext,
  serializeError,
  type LogEntry,
  type LogLevel,
  type CreateLoggerOptions,
} from "@/lib/logger"

interface CapturedLog {
  formatted: string
  entry: LogEntry
  level: LogLevel
}

function capture(options: CreateLoggerOptions = {}) {
  const logs: CapturedLog[] = []
  const logger = createLogger({
    level: "debug",
    pretty: false,
    ...options,
    sink: (formatted, entry, level) => logs.push({ formatted, entry, level }),
  })
  return { logger, logs }
}

function lastLog(logs: CapturedLog[]) {
  const last = logs.at(-1)
  if (!last) throw new Error("Expected at least one log entry")
  return last
}

describe("logger", () => {
  it("emits one JSON object with the required fields", () => {
    const { logger, logs } = capture()

    logger.error("boom", {
      requestId: "req-123",
      context: { route: "POST /api/test", userId: "user-1" },
      error: new Error("kaboom"),
    })

    const { formatted, entry } = lastLog(logs)
    const parsed = JSON.parse(formatted) as LogEntry

    expect(parsed).toMatchObject({
      level: "error",
      msg: "boom",
      requestId: "req-123",
      context: { route: "POST /api/test", userId: "user-1" },
    })
    expect(parsed.timestamp).toBe(entry.timestamp)
    expect(new Date(parsed.timestamp).getTime()).not.toBeNaN()
    expect(parsed.error).toMatchObject({ name: "Error", message: "kaboom" })
    expect(parsed.error?.stack).toContain("kaboom")
  })

  it("omits optional fields when they are not provided", () => {
    const { logger, logs } = capture()

    logger.info("hello")

    const parsed = JSON.parse(lastLog(logs).formatted) as Record<string, unknown>
    expect(parsed).toHaveProperty("timestamp")
    expect(parsed).toHaveProperty("level", "info")
    expect(parsed).toHaveProperty("msg", "hello")
    expect(parsed).not.toHaveProperty("requestId")
    expect(parsed).not.toHaveProperty("context")
    expect(parsed).not.toHaveProperty("error")
  })

  it("redacts sensitive keys recursively, including arrays", () => {
    const { logger, logs } = capture()

    logger.info("login", {
      context: {
        email: "member@example.com",
        password: "super-secret-password",
        passwordHash: "$2b$10$hash",
        token: "tok_live_123",
        refreshToken: "refresh_123",
        authorization: "Bearer abc.def",
        cookie: "session=abc",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        AUTH_SECRET: "a".repeat(32),
        STRIPE_SECRET_KEY: "sk_live_123",
        nested: { apiKey: "key-123", safe: "visible" },
        items: [{ secret: "nested-secret", label: "ok" }],
      },
    })

    const context = JSON.parse(lastLog(logs).formatted).context as Record<string, unknown>
    const nested = context.nested as Record<string, unknown>
    const items = context.items as Array<Record<string, unknown>>

    expect(context.email).toBe("member@example.com")
    expect(context.password).toBe("[REDACTED]")
    expect(context.passwordHash).toBe("[REDACTED]")
    expect(context.token).toBe("[REDACTED]")
    expect(context.refreshToken).toBe("[REDACTED]")
    expect(context.authorization).toBe("[REDACTED]")
    expect(context.cookie).toBe("[REDACTED]")
    expect(context.DATABASE_URL).toBe("[REDACTED]")
    expect(context.AUTH_SECRET).toBe("[REDACTED]")
    expect(context.STRIPE_SECRET_KEY).toBe("[REDACTED]")
    expect(nested.apiKey).toBe("[REDACTED]")
    expect(nested.safe).toBe("visible")
    expect(items[0].secret).toBe("[REDACTED]")
    expect(items[0].label).toBe("ok")
  })

  it("never leaks credentials embedded in messages or errors", () => {
    const { logger, logs } = capture()

    logger.error(
      "connect postgresql://user:supersecret@db:5432/app with password=hunter2 and Authorization: Bearer abc.def.ghi",
      { error: new Error("token=rawtoken123") }
    )

    const formatted = lastLog(logs).formatted
    expect(formatted).not.toContain("supersecret")
    expect(formatted).not.toContain("hunter2")
    expect(formatted).not.toContain("abc.def.ghi")
    expect(formatted).not.toContain("rawtoken123")
    expect(formatted).toContain("[REDACTED]")
  })

  it("replaces circular references instead of throwing", () => {
    const circular: Record<string, unknown> = { name: "loop" }
    circular.self = circular

    const sanitized = sanitizeContext(circular) as Record<string, unknown>

    expect(sanitized.name).toBe("loop")
    expect(sanitized.self).toBe("[Circular]")
  })

  it("filters logs below the configured level", () => {
    const { logger, logs } = capture({ level: "warn" })

    logger.debug("debug")
    logger.info("info")
    logger.warn("warn")
    logger.error("error")

    expect(logs.map((log) => log.entry.msg)).toEqual(["warn", "error"])
  })

  it("uses a readable format in development mode", () => {
    const { logger, logs } = capture({ pretty: true })

    logger.info("starting", { requestId: "req-1", context: { port: 3000 } })
    logger.error("failed", { error: new Error("kaboom") })

    expect(lastLog(logs).formatted).not.toMatch(/^\{/)
    expect(logs[0].formatted).toContain("INFO")
    expect(logs[0].formatted).toContain("starting")
    expect(logs[0].formatted).toContain("requestId=req-1")
    expect(logs[1].formatted).toContain("\n  Error: kaboom")
  })

  it("exposes redaction and serialization helpers", () => {
    expect(redactString("password=hunter2")).toBe("password=[REDACTED]")
    expect(redactString("postgresql://user:pass@host/db")).toBe("postgresql://[REDACTED]@host/db")
    expect(serializeError("plain failure")).toEqual({ name: "Error", message: "plain failure" })
    expect(serializeError({ name: "CustomError", message: "token=abc" })).toEqual({
      name: "CustomError",
      message: "token=[REDACTED]",
    })
  })
})
