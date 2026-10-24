import Redis from "ioredis"

let client: Redis | null = null

function getClient(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
    })
  }
  return client
}

/**
 * Fixed-window rate limit. Fails open when Redis is unavailable so the app
 * remains usable; infrastructure should alert on degraded health.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const redis = getClient()
  if (!redis) return true

  try {
    if (redis.status === "wait") await redis.connect()
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    return count <= limit
  } catch {
    return true
  }
}

export function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}
