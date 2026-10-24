import { NextResponse } from "next/server"
import Redis from "ioredis"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { REQUEST_ID_HEADER, generateRequestId, getRequestId } from "@/lib/request-id"

export async function GET(request?: Request) {
  const requestId = request ? getRequestId(request) : generateRequestId()

  const checks: Record<string, "ok" | "error"> = {
    database: "error",
    redis: process.env.REDIS_URL ? "error" : "ok",
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = "ok"
  } catch (error) {
    logger.warn("Health check failed: database", {
      requestId,
      context: { route: "GET /api/health", check: "database" },
      error,
    })
    checks.database = "error"
  }

  if (process.env.REDIS_URL) {
    const redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
    })
    try {
      await redis.connect()
      const pong = await redis.ping()
      checks.redis = pong === "PONG" ? "ok" : "error"
    } catch (error) {
      logger.warn("Health check failed: redis", {
        requestId,
        context: { route: "GET /api/health", check: "redis" },
        error,
      })
      checks.redis = "error"
    } finally {
      redis.disconnect()
    }
  }

  const ok = Object.values(checks).every((value) => value === "ok")
  const response = NextResponse.json(
    { status: ok ? "ok" : "degraded", timestamp: new Date().toISOString(), checks },
    { status: ok ? 200 : 503 }
  )
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}
