import type { Instrumentation } from "next"
import { logger } from "./lib/logger"
import { isValidRequestId } from "./lib/request-id"

type GlobalWithLogHandlers = typeof globalThis & {
  __gymProcessErrorHandlersRegistered?: boolean
}

function registerProcessErrorHandlers(): void {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const globalScope = globalThis as GlobalWithLogHandlers
  if (globalScope.__gymProcessErrorHandlersRegistered) return
  globalScope.__gymProcessErrorHandlersRegistered = true

  // Node's default behaviour for unhandled rejections is to crash the process.
  // Log first, then keep the non-zero exit so failures are never swallowed.
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", {
      context: { source: "unhandledRejection" },
      error: reason,
    })
    process.exit(1)
  })

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
      context: { source: "uncaughtException" },
      error,
    })
    process.exit(1)
  })
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  registerProcessErrorHandlers()

  const { validateEnv } = await import("./lib/env")

  try {
    validateEnv()
  } catch (error) {
    logger.error("Invalid environment configuration", { error })
    process.exit(1)
  }
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const rawRequestId = request.headers["x-request-id"]
  const requestId = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId

  logger.error("Unhandled request error", {
    ...(isValidRequestId(requestId) ? { requestId } : {}),
    context: {
      path: request.path.split("?")[0],
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    error,
  })
}
