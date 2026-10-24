/**
 * Lightweight structured logger with automatic secret redaction.
 *
 * - Production: one JSON object per line (easy to ingest).
 * - Development: human-readable output.
 * - No external dependencies and safe to import from both server and client code.
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export type LogContext = Record<string, unknown>

export interface SerializedError {
  name: string
  message: string
  stack?: string
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  msg: string
  requestId?: string
  context?: unknown
  error?: SerializedError
}

export interface LogMeta {
  requestId?: string
  context?: LogContext
  error?: unknown
}

export type LogSink = (formatted: string, entry: LogEntry, level: LogLevel) => void

export interface CreateLoggerOptions {
  level?: LogLevel
  pretty?: boolean
  sink?: LogSink
  baseContext?: LogContext
  requestId?: string
}

export interface Logger {
  debug(msg: string, meta?: LogMeta): void
  info(msg: string, meta?: LogMeta): void
  warn(msg: string, meta?: LogMeta): void
  error(msg: string, meta?: LogMeta): void
}

const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"]

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const REDACTED = "[REDACTED]"

/**
 * Keys are normalized (lowercase, non-alphanumeric removed) before matching so
 * `DATABASE_URL`, `database-url` and `databaseUrl` are all caught.
 */
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pwd|secret|token|authorization|cookie|credential|apikey|privatekey|databaseurl|redisurl|connectionstring|sessionid)/i

const EMBEDDED_SECRET_PATTERN =
  /\b(password|passwd|pwd|secret|token|authorization|cookie|api[_-]?key|database_url|redis_url|auth_secret|stripe_secret_key|stripe_webhook_secret|auth_google_secret)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi

/**
 * Redact credentials embedded in free-form strings (error messages, stack
 * traces) and `key=value` / `key: value` pairs.
 */
export function redactString(value: string): string {
  return value
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, `$1${REDACTED}@`)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(EMBEDDED_SECRET_PATTERN, (_match, key: string) => `${key}=${REDACTED}`)
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "")
  return SENSITIVE_KEY_PATTERN.test(normalized)
}

function stringifyUnknown(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Recursively sanitize arbitrary context: redact sensitive keys, serialize
 * errors, normalize dates and replace circular references.
 */
export function sanitizeContext(value: unknown, seen: Set<object> = new Set()): unknown {
  if (value === null || value === undefined) return value

  const type = typeof value
  if (type === "string") return redactString(value as string)
  if (type === "number" || type === "boolean") return value
  if (type === "bigint") return (value as bigint).toString()
  if (type === "symbol") return (value as symbol).toString()
  if (type === "function") return "[Function]"

  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return serializeError(value)

  if (seen.has(value as object)) return "[Circular]"
  seen.add(value as object)

  try {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeContext(item, seen))
    }

    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = isSensitiveKey(key) ? REDACTED : sanitizeContext(child, seen)
    }
    return output
  } finally {
    seen.delete(value as object)
  }
}

/**
 * Convert any thrown value into a stable, log-safe shape. Stacks are kept for
 * server logs but callers should never render this object in the UI.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: redactString(error.name || "Error"),
      message: redactString(error.message || "Unknown error"),
      ...(error.stack ? { stack: redactString(error.stack) } : {}),
    }
  }

  if (typeof error === "string") {
    return { name: "Error", message: redactString(error) }
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { name?: unknown; message?: unknown }
    if (typeof candidate.message === "string") {
      return {
        name: typeof candidate.name === "string" ? redactString(candidate.name) : "Error",
        message: redactString(candidate.message),
      }
    }
  }

  return { name: "Error", message: redactString(stringifyUnknown(sanitizeContext(error))) }
}

function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value)
}

function getEnv(key: string): string | undefined {
  return typeof process !== "undefined" ? process.env[key] : undefined
}

function resolveDefaultLevel(): LogLevel {
  const configured = getEnv("LOG_LEVEL")?.toLowerCase()
  if (configured && isLogLevel(configured)) return configured
  return getEnv("NODE_ENV") === "production" ? "info" : "debug"
}

function formatPretty(entry: LogEntry): string {
  const parts = [`[${entry.timestamp}]`, entry.level.toUpperCase().padEnd(5), entry.msg]
  if (entry.requestId) parts.push(`requestId=${entry.requestId}`)
  if (entry.context !== undefined) parts.push(stringifyUnknown(entry.context))

  let formatted = parts.join(" ")
  if (entry.error) {
    formatted += `\n  ${entry.error.name}: ${entry.error.message}`
    if (entry.error.stack) {
      formatted += `\n${entry.error.stack
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}`
    }
  }
  return formatted
}

function defaultSink(formatted: string, _entry: LogEntry, level: LogLevel): void {
  if (level === "debug") console.debug(formatted)
  else if (level === "info") console.info(formatted)
  else if (level === "warn") console.warn(formatted)
  else console.error(formatted)
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const threshold = options.level ?? resolveDefaultLevel()
  const pretty = options.pretty ?? getEnv("NODE_ENV") !== "production"
  const sink = options.sink ?? defaultSink
  const baseContext = options.baseContext
  const baseRequestId = options.requestId

  function emit(level: LogLevel, msg: string, meta: LogMeta = {}): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[threshold]) return

    const requestId = meta.requestId ?? baseRequestId
    const context = meta.context ? { ...(baseContext ?? {}), ...meta.context } : baseContext

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      msg: redactString(msg),
      ...(requestId ? { requestId } : {}),
      ...(context !== undefined ? { context: sanitizeContext(context) } : {}),
      ...(meta.error !== undefined ? { error: serializeError(meta.error) } : {}),
    }

    sink(pretty ? formatPretty(entry) : JSON.stringify(entry), entry, level)
  }

  return {
    debug: (msg, meta) => emit("debug", msg, meta),
    info: (msg, meta) => emit("info", msg, meta),
    warn: (msg, meta) => emit("warn", msg, meta),
    error: (msg, meta) => emit("error", msg, meta),
  }
}

export const logger = createLogger()
