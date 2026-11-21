import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const notificationFindMany = vi.fn()
  const notificationFindUnique = vi.fn()
  const notificationCreate = vi.fn()
  const notificationUpdate = vi.fn()
  const notificationDelete = vi.fn()
  const notificationCount = vi.fn()
  const getTrainerClientIds = vi.fn()
  const connectRealtimeSub = vi.fn()
  const unsubscribe = vi.fn()
  type Payload = { type: string; id: string; gymId: string | null }
  const realtimeListeners: Array<(payload: Payload) => void> = []
  const subscribeRealtime = vi.fn((listener: (payload: Payload) => void) => {
    realtimeListeners.push(listener)
    return unsubscribe
  })

  return {
    userFindUnique,
    notificationFindMany,
    notificationFindUnique,
    notificationCreate,
    notificationUpdate,
    notificationDelete,
    notificationCount,
    getTrainerClientIds,
    connectRealtimeSub,
    subscribeRealtime,
    unsubscribe,
    realtimeListeners,
    prisma: {
      user: { findUnique: userFindUnique },
      notification: {
        findMany: notificationFindMany,
        findUnique: notificationFindUnique,
        create: notificationCreate,
        update: notificationUpdate,
        delete: notificationDelete,
        count: notificationCount,
      },
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/trainer-client", () => ({
  getTrainerClientIds: (...args: unknown[]) => mocks.getTrainerClientIds(...args),
}))
vi.mock("@/lib/realtime", async (importOriginal) => ({
  canReceiveRealtime: (await importOriginal<typeof import("@/lib/realtime")>()).canReceiveRealtime,
  connectRealtimeSub: () => mocks.connectRealtimeSub(),
  subscribeRealtime: mocks.subscribeRealtime,
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json", ...init?.headers },
      })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { GET as listNotifications, POST as createNotification } from "@/app/api/notifications/route"
import {
  PATCH as markNotificationRead,
  DELETE as deleteNotification,
} from "@/app/api/notifications/[id]/route"
import { GET as getUnreadCount } from "@/app/api/notifications/unread-count/route"
import { GET as openEvents } from "@/app/api/events/route"

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockImplementation(
    async (args: { where: { email?: string; id?: string } }) =>
      args.where.email ? { id, role, gymId } : null
  )
}

/** Usuarios que la ruta busca por id (destinatario de la notificación). */
function withTargets(targets: Record<string, { id: string; gymId: string | null }>) {
  const sessionImpl = mocks.userFindUnique.getMockImplementation()
  mocks.userFindUnique.mockImplementation(
    async (args: { where: { email?: string; id?: string } }) => {
      if (args.where.id) return targets[args.where.id] ?? null
      return sessionImpl ? sessionImpl(args) : null
    }
  )
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost:3000${url}`, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  })
}

function withId(url: string, id: string, method: string) {
  return [jsonRequest(`${url}/${id}`, method), { params: Promise.resolve({ id }) }] as const
}

const validNotification = {
  title: "Recordatorio",
  message: "Mañana tienes clase a las 7",
  userId: "member-1",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockReset()
  mocks.userFindUnique.mockReset().mockResolvedValue(null)
  mocks.notificationFindMany.mockReset().mockResolvedValue([])
  mocks.notificationFindUnique.mockReset().mockResolvedValue(null)
  mocks.notificationCreate
    .mockReset()
    .mockImplementation(async (a: { data: object }) => ({ id: "n-new", read: false, ...a.data }))
  mocks.notificationUpdate
    .mockReset()
    .mockImplementation(async (a: { where: { id: string }; data: object }) => ({
      id: a.where.id,
      ...a.data,
    }))
  mocks.notificationDelete.mockReset().mockResolvedValue({})
  mocks.notificationCount.mockReset().mockResolvedValue(0)
  mocks.getTrainerClientIds.mockReset().mockResolvedValue([])
  mocks.connectRealtimeSub.mockReset().mockResolvedValue(undefined)
  mocks.realtimeListeners.length = 0
})

describe("GET /api/notifications", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listNotifications(jsonRequest("/api/notifications", "GET"))

    expect(response.status).toBe(401)
    expect(mocks.notificationFindMany).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await listNotifications(jsonRequest("/api/notifications", "GET"))

    expect(response.status).toBe(404)
  })

  it("solo busca las notificaciones del usuario de la sesión, de la más nueva a la más vieja", async () => {
    loginAs("MEMBER")
    mocks.notificationFindMany.mockResolvedValue([{ id: "n-1", userId: "u-member" }])

    const response = await listNotifications(jsonRequest("/api/notifications", "GET"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ notifications: [{ id: "n-1", userId: "u-member" }] })
    expect(mocks.notificationFindMany).toHaveBeenCalledWith({
      where: { userId: "u-member" },
      orderBy: { createdAt: "desc" },
    })
  })

  it("con ?unread=true filtra las no leídas", async () => {
    loginAs("MEMBER")

    await listNotifications(jsonRequest("/api/notifications?unread=true", "GET"))

    expect(mocks.notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-member", read: false } })
    )
  })

  it("ignora un userId en la URL: no deja leer las notificaciones de otra persona", async () => {
    loginAs("ADMIN")

    await listNotifications(jsonRequest("/api/notifications?userId=member-1", "GET"))

    expect(mocks.notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-admin" } })
    )
  })

  it.todo(
    "no tiene límite ni paginación: devuelve todas las notificaciones del usuario, aunque sean miles"
  )
})

describe("POST /api/notifications", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(401)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("un miembro no puede crear notificaciones", async () => {
    loginAs("MEMBER")

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(403)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("responde 403 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(403)
  })

  it("responde 400 si falta el título, el mensaje o el destinatario", async () => {
    loginAs("ADMIN")

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", { title: "", message: "", userId: "" })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toHaveProperty("title")
    expect(data.details).toHaveProperty("message")
    expect(data.details).toHaveProperty("userId")
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("responde 400 con un tipo que no existe", async () => {
    loginAs("ADMIN")

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", { ...validNotification, type: "SPAM" })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).details).toHaveProperty("type")
  })

  it("responde 404 si el destinatario no existe", async () => {
    loginAs("ADMIN")
    withTargets({})

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(404)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("un admin no puede notificar a un miembro de otro gimnasio (responde 404)", async () => {
    loginAs("ADMIN", "gym-1")
    withTargets({ "member-1": { id: "member-1", gymId: "gym-2" } })

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(404)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("un admin notifica a un miembro de su gimnasio con tipo INFO por defecto", async () => {
    loginAs("ADMIN", "gym-1")
    withTargets({ "member-1": { id: "member-1", gymId: "gym-1" } })

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(201)
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: { ...validNotification, type: "INFO" },
    })
    expect((await response.json()).notification).toMatchObject({ id: "n-new", type: "INFO" })
  })

  it("un coach no puede notificar a alguien que no es su cliente", async () => {
    loginAs("TRAINER", "gym-1")
    withTargets({ "member-1": { id: "member-1", gymId: "gym-1" } })
    mocks.getTrainerClientIds.mockResolvedValue(["member-2"])

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe("Solo puedes notificar a tus clientes")
    expect(mocks.getTrainerClientIds).toHaveBeenCalledWith("u-trainer", "gym-1")
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("un coach notifica a su cliente con el tipo que elija", async () => {
    loginAs("TRAINER", "gym-1")
    withTargets({ "member-1": { id: "member-1", gymId: "gym-1" } })
    mocks.getTrainerClientIds.mockResolvedValue(["member-1"])

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", { ...validNotification, type: "REMINDER" })
    )

    expect(response.status).toBe(201)
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "member-1", type: "REMINDER" }),
    })
  })

  it("el súper admin puede notificar a un usuario de cualquier gimnasio", async () => {
    loginAs("SUPER_ADMIN", null)
    withTargets({ "member-1": { id: "member-1", gymId: "gym-9" } })

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(201)
    expect(mocks.getTrainerClientIds).not.toHaveBeenCalled()
  })

  it.todo(
    "con un cuerpo que no es JSON debería responder 400; hoy `request.json()` no está protegido y la ruta lanza un error (500 sin cuerpo JSON)"
  )
  it("un admin sin gimnasio no puede notificar a un usuario sin gimnasio (404)", async () => {
    loginAs("ADMIN", null)
    withTargets({ "member-1": { id: "member-1", gymId: null } })

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(404)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("un coach no puede notificar a un cliente asignado que está en otro gimnasio (404)", async () => {
    loginAs("TRAINER", "gym-1")
    withTargets({ "member-1": { id: "member-1", gymId: "gym-2" } })
    mocks.getTrainerClientIds.mockResolvedValue(["member-1"])

    const response = await createNotification(
      jsonRequest("/api/notifications", "POST", validNotification)
    )

    expect(response.status).toBe(404)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })
  it.todo("no limita el largo del título ni del mensaje")
  it.todo(
    "no llama a emitRealtime(«notifications») como `notifications/send`: la campana del destinatario no se actualiza hasta que recarga"
  )
})

describe("PATCH /api/notifications/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await markNotificationRead(...withId("/api/notifications", "n-1", "PATCH"))

    expect(response.status).toBe(401)
    expect(mocks.notificationUpdate).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await markNotificationRead(...withId("/api/notifications", "n-1", "PATCH"))

    expect(response.status).toBe(404)
  })

  it("responde 404 si la notificación no existe", async () => {
    loginAs("MEMBER")

    const response = await markNotificationRead(...withId("/api/notifications", "n-x", "PATCH"))

    expect(response.status).toBe(404)
    expect(mocks.notificationUpdate).not.toHaveBeenCalled()
  })

  it("no deja marcar como leída la notificación de otra persona, ni siendo admin", async () => {
    loginAs("ADMIN")
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "member-1" })

    const response = await markNotificationRead(...withId("/api/notifications", "n-1", "PATCH"))

    expect(response.status).toBe(403)
    expect(mocks.notificationUpdate).not.toHaveBeenCalled()
  })

  it("marca como leída la notificación propia", async () => {
    loginAs("MEMBER")
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "u-member" })

    const response = await markNotificationRead(...withId("/api/notifications", "n-1", "PATCH"))

    expect(response.status).toBe(200)
    expect(mocks.notificationUpdate).toHaveBeenCalledWith({
      where: { id: "n-1" },
      data: { read: true },
    })
    expect((await response.json()).notification).toEqual({ id: "n-1", read: true })
  })

  it.todo(
    "con la notificación de otra persona responde 403 y confirma que el id existe; debería responder 404 como DELETE con un admin de otro gimnasio"
  )
})

describe("DELETE /api/notifications/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(401)
    expect(mocks.notificationDelete).not.toHaveBeenCalled()
  })

  it("responde 404 si la notificación no existe", async () => {
    loginAs("MEMBER")

    const response = await deleteNotification(...withId("/api/notifications", "n-x", "DELETE"))

    expect(response.status).toBe(404)
    expect(mocks.notificationDelete).not.toHaveBeenCalled()
  })

  it("borra la notificación propia", async () => {
    loginAs("MEMBER")
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "u-member" })

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mocks.notificationDelete).toHaveBeenCalledWith({ where: { id: "n-1" } })
  })

  it("un miembro no puede borrar la notificación de otra persona", async () => {
    loginAs("MEMBER")
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "member-2" })

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.notificationDelete).not.toHaveBeenCalled()
  })

  it("un coach no puede borrar la notificación de su cliente", async () => {
    loginAs("TRAINER")
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "member-1" })

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.notificationDelete).not.toHaveBeenCalled()
  })

  it("un admin borra la notificación de un miembro de su gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    withTargets({ "member-1": { id: "member-1", gymId: "gym-1" } })
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "member-1" })

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(mocks.notificationDelete).toHaveBeenCalledWith({ where: { id: "n-1" } })
  })

  it("un admin no puede borrar la notificación de alguien de otro gimnasio (responde 404)", async () => {
    loginAs("ADMIN", "gym-1")
    withTargets({ "member-1": { id: "member-1", gymId: "gym-2" } })
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "member-1" })

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(404)
    expect(mocks.notificationDelete).not.toHaveBeenCalled()
  })

  it("un admin sin gimnasio no puede borrar notificaciones de usuarios sin gimnasio", async () => {
    loginAs("ADMIN", null)
    withTargets({ "member-1": { id: "member-1", gymId: null } })
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "member-1" })

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(404)
    expect(mocks.notificationDelete).not.toHaveBeenCalled()
  })

  it("el súper admin borra cualquier notificación", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.notificationFindUnique.mockResolvedValue({ id: "n-1", userId: "member-1" })

    const response = await deleteNotification(...withId("/api/notifications", "n-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(mocks.notificationDelete).toHaveBeenCalledWith({ where: { id: "n-1" } })
  })
})

describe("GET /api/notifications/unread-count", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getUnreadCount()

    expect(response.status).toBe(401)
    expect(mocks.notificationCount).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await getUnreadCount()

    expect(response.status).toBe(404)
  })

  it("cuenta solo las no leídas del usuario de la sesión", async () => {
    loginAs("MEMBER")
    mocks.notificationCount.mockResolvedValue(3)

    const response = await getUnreadCount()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ count: 3 })
    expect(mocks.notificationCount).toHaveBeenCalledWith({
      where: { userId: "u-member", read: false },
    })
  })
})

describe("GET /api/events", () => {
  async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const { value } = await reader.read()
    return new TextDecoder().decode(value)
  }

  it("responde 401 en texto plano sin sesión y no se suscribe", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await openEvents(new Request("http://localhost:3000/api/events"))

    expect(response.status).toBe(401)
    expect(await response.text()).toBe("No autorizado")
    expect(mocks.connectRealtimeSub).not.toHaveBeenCalled()
    expect(mocks.subscribeRealtime).not.toHaveBeenCalled()
  })

  it("abre un stream de eventos con las cabeceras de SSE y avisa que se conectó", async () => {
    loginAs("MEMBER")
    const controller = new AbortController()

    const response = await openEvents(
      new Request("http://localhost:3000/api/events", { signal: controller.signal })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/event-stream")
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform")
    expect(response.headers.get("X-Accel-Buffering")).toBe("no")
    expect(mocks.connectRealtimeSub).toHaveBeenCalledTimes(1)

    const reader = response.body!.getReader()
    expect(await readChunk(reader)).toBe("event: connected\ndata: {}\n\n")
    controller.abort()
  })

  it("reenvía cada evento solo con su tipo y la hora, sin datos del recurso", async () => {
    loginAs("MEMBER")
    const controller = new AbortController()
    const response = await openEvents(
      new Request("http://localhost:3000/api/events", { signal: controller.signal })
    )
    const reader = response.body!.getReader()
    await readChunk(reader)

    mocks.realtimeListeners.at(-1)!({ type: "notifications", id: "evt-1", gymId: "gym-1" })
    const chunk = await readChunk(reader)

    expect(chunk).toMatch(/^event: notifications\ndata: \{"at":\d+\}\n\n$/)
    expect(chunk).not.toContain("evt-1")
    controller.abort()
  })

  it("al cerrar la conexión cancela la suscripción y cierra el stream", async () => {
    loginAs("MEMBER")
    const controller = new AbortController()
    const response = await openEvents(
      new Request("http://localhost:3000/api/events", { signal: controller.signal })
    )
    const reader = response.body!.getReader()
    await readChunk(reader)

    controller.abort()

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
    expect((await reader.read()).done).toBe(true)
  })

  it("no reenvía los eventos de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    const controller = new AbortController()
    const response = await openEvents(
      new Request("http://localhost:3000/api/events", { signal: controller.signal })
    )
    const reader = response.body!.getReader()
    await readChunk(reader)

    const listener = mocks.realtimeListeners.at(-1)!
    listener({ type: "pending-count", id: "evt-otro", gymId: "gym-2" })
    listener({ type: "pending-count", id: "evt-sin-gym", gymId: null })
    listener({ type: "notifications", id: "evt-propio", gymId: "gym-1" })

    expect(await readChunk(reader)).toMatch(/^event: notifications\n/)
    controller.abort()
  })

  it("el súper admin recibe los eventos de todos los gimnasios", async () => {
    loginAs("SUPER_ADMIN", null)
    const controller = new AbortController()
    const response = await openEvents(
      new Request("http://localhost:3000/api/events", { signal: controller.signal })
    )
    const reader = response.body!.getReader()
    await readChunk(reader)

    mocks.realtimeListeners.at(-1)!({ type: "pending-count", id: "evt-1", gymId: "gym-2" })

    expect(await readChunk(reader)).toMatch(/^event: pending-count\n/)
    controller.abort()
  })
})
