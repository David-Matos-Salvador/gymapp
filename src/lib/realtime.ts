import { EventEmitter } from "node:events"
import { randomUUID } from "node:crypto"
import Redis from "ioredis"

export type RealtimeEventType = "pending-count" | "notifications"

export interface RealtimePayload {
  type: RealtimeEventType
  id: string
  /** Gimnasio al que pertenece el evento: solo lo reciben las sesiones de ese gimnasio. */
  gymId: string | null
}

/** El súper admin recibe todo; el resto, solo los eventos de su gimnasio. */
export function canReceiveRealtime(
  payload: Pick<RealtimePayload, "gymId">,
  user: { role: string; gymId: string | null }
): boolean {
  if (user.role === "SUPER_ADMIN") return true
  return Boolean(payload.gymId && payload.gymId === user.gymId)
}

const CHANNEL = "gymapp:events"

// Singleton global (sobrevive a HMR en dev y a múltiples instancias de módulo).
const globalForRealtime = globalThis as unknown as {
  __realtimeEmitter?: EventEmitter
  __realtimePub?: Redis
  __realtimeSub?: Redis
}

export const realtimeEmitter = globalForRealtime.__realtimeEmitter ?? new EventEmitter()
globalForRealtime.__realtimeEmitter = realtimeEmitter

const redisUrl = process.env.REDIS_URL

function getPub(): Redis | null {
  if (!redisUrl) return null
  if (!globalForRealtime.__realtimePub) {
    const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })
    client.on("error", () => {})
    globalForRealtime.__realtimePub = client
  }
  return globalForRealtime.__realtimePub
}

function getSub(): Redis | null {
  if (!redisUrl) return null
  if (!globalForRealtime.__realtimeSub) {
    const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })
    client.on("error", () => {})
    globalForRealtime.__realtimeSub = client
  }
  return globalForRealtime.__realtimeSub
}

export function emitRealtime(type: RealtimeEventType, gymId: string | null) {
  const payload: RealtimePayload = { type, id: randomUUID(), gymId }

  // Siempre emite local (funciona aunque Redis esté caído).
  realtimeEmitter.emit("event", payload)

  // Publica a Redis para el resto de instancias. Con lazyConnect, publish
  // conecta automáticamente; si Redis no está listo se ignora.
  const pub = getPub()
  if (pub) {
    pub.connect().catch(() => {})
    pub.publish(CHANNEL, JSON.stringify(payload)).catch(() => {})
  }
}

// Conecta y suscribe el cliente Redis (await para asegurar la conexión).
// Idempotente: connect/subscribe en un cliente ya listo son no-ops.
export async function connectRealtimeSub(): Promise<void> {
  const sub = getSub()
  if (!sub) return
  try {
    if (sub.status === "wait" || sub.status === "end" || sub.status === "close") {
      await sub.connect()
    }
    await sub.subscribe(CHANNEL)
  } catch {
    // Redis no disponible; el fallback in-memory sigue activo
  }
}

export function subscribeRealtime(listener: (payload: RealtimePayload) => void): () => void {
  // Dedupe por id: en una sola instancia el mensaje llega dos veces
  // (local + round-trip por Redis); solo se entrega una.
  const recent = new Set<string>()
  const deliver = (payload: RealtimePayload) => {
    if (recent.has(payload.id)) return
    recent.add(payload.id)
    if (recent.size > 500) {
      const first = recent.values().next().value
      if (first) recent.delete(first)
    }
    listener(payload)
  }

  realtimeEmitter.on("event", deliver)

  let unsubscribeRedis: (() => void) | null = null
  const sub = getSub()
  if (sub) {
    const onMessage = (_channel: string, message: string) => {
      try {
        deliver(JSON.parse(message) as RealtimePayload)
      } catch {
        // mensaje malformado, ignorar
      }
    }
    sub.on("message", onMessage)
    unsubscribeRedis = () => {
      sub.off("message", onMessage)
    }
  }

  return () => {
    realtimeEmitter.off("event", deliver)
    unsubscribeRedis?.()
  }
}
