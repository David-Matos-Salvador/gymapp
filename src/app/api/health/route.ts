import { NextResponse } from "next/server"
import Redis from "ioredis"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    database: "error",
    redis: process.env.REDIS_URL ? "error" : "ok",
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = "ok"
  } catch {
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
    } catch {
      checks.redis = "error"
    } finally {
      redis.disconnect()
    }
  }

  const ok = Object.values(checks).every((value) => value === "ok")
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", timestamp: new Date().toISOString(), checks },
    { status: ok ? 200 : 503 }
  )
}
