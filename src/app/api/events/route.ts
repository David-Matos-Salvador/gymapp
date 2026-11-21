import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canReceiveRealtime, connectRealtimeSub, subscribeRealtime } from "@/lib/realtime"

export const dynamic = "force-dynamic"

const HEARTBEAT_MS = 25_000

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response("No autorizado", { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, gymId: true },
  })
  if (!user) {
    return new Response("No autorizado", { status: 401 })
  }

  await connectRealtimeSub()

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          // conexión cerrada
        }
      }

      const unsubscribe = subscribeRealtime((payload) => {
        if (!canReceiveRealtime(payload, user)) return
        send(`event: ${payload.type}\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`)
      })

      const heartbeat = setInterval(() => {
        send(": ping\n\n")
      }, HEARTBEAT_MS)

      send("event: connected\ndata: {}\n\n")

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // ya cerrado
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
