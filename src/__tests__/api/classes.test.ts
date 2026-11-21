import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const classFindMany = vi.fn()
  const classFindUnique = vi.fn()
  const classCreate = vi.fn()
  const classUpdate = vi.fn()
  const bookingCount = vi.fn()
  const bookingFindMany = vi.fn()
  const bookingUpdateMany = vi.fn()
  const notificationCreateMany = vi.fn()
  const transaction = vi.fn()
  const emitRealtime = vi.fn()

  return {
    userFindUnique,
    classFindMany,
    classFindUnique,
    classCreate,
    classUpdate,
    bookingCount,
    bookingFindMany,
    bookingUpdateMany,
    notificationCreateMany,
    transaction,
    emitRealtime,
    prisma: {
      user: { findUnique: userFindUnique },
      class: {
        findMany: classFindMany,
        findUnique: classFindUnique,
        create: classCreate,
        update: classUpdate,
      },
      booking: { count: bookingCount, findMany: bookingFindMany, updateMany: bookingUpdateMany },
      notification: { createMany: notificationCreateMany },
      $transaction: transaction,
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/realtime", () => ({
  emitRealtime: (...args: unknown[]) => mocks.emitRealtime(...args),
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

import { GET as listClasses, POST as createClass } from "@/app/api/classes/route"
import {
  GET as getClass,
  PATCH as updateClass,
  DELETE as deleteClass,
} from "@/app/api/classes/[id]/route"

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId })
}

function jsonRequest(method: string, body: unknown, url = "http://localhost:3000/api/classes") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function params(id = "c-1") {
  return { params: Promise.resolve({ id }) }
}

const validClass = {
  name: "Spinning",
  capacity: 20,
  duration: 45,
  dayOfWeek: "MONDAY",
  startTime: "07:30",
}

function storedClass(overrides: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    name: "Spinning",
    trainerId: "u-trainer",
    gymId: "gym-1",
    capacity: 20,
    active: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userFindUnique.mockReset()
  mocks.classFindMany.mockReset().mockResolvedValue([])
  mocks.classFindUnique.mockReset()
  mocks.classCreate
    .mockReset()
    .mockImplementation(async (args: { data: object }) => ({ id: "c-new", ...args.data }))
  mocks.classUpdate
    .mockReset()
    .mockImplementation(async (args: { data: object }) => ({ id: "c-1", ...args.data }))
  mocks.bookingCount.mockReset().mockResolvedValue(0)
  mocks.bookingFindMany.mockReset().mockResolvedValue([])
  mocks.bookingUpdateMany.mockReset().mockResolvedValue({ count: 0 })
  mocks.notificationCreateMany.mockReset().mockResolvedValue({ count: 0 })
  mocks.transaction.mockReset().mockImplementation(async (ops: unknown[]) => ops)
})

describe("GET /api/classes", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listClasses()

    expect(response.status).toBe(401)
    expect(mocks.classFindMany).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "fantasma@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await listClasses()

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Usuario no encontrado" })
  })

  it("solo lista las clases activas del gimnasio del usuario", async () => {
    loginAs("MEMBER", "gym-1")

    await listClasses()

    expect(mocks.classFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gymId: "gym-1", active: true } })
    )
  })

  it("un usuario sin gimnasio no ve clases de ningún gimnasio", async () => {
    loginAs("MEMBER", null)

    await listClasses()

    const where = mocks.classFindMany.mock.calls[0][0].where
    expect(where.gymId).not.toBeNull()
    expect(where.gymId).not.toBeUndefined()
    expect(where.active).toBe(true)
  })

  it("devuelve el número de reservas confirmadas sin exponer quién reservó", async () => {
    loginAs("MEMBER", "gym-1")
    mocks.classFindMany.mockResolvedValue([
      {
        id: "c-1",
        name: "Spinning",
        trainer: { name: "Ana" },
        bookings: [{ id: "b-1" }, { id: "b-2" }],
      },
    ])

    const response = await listClasses()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      classes: [{ id: "c-1", name: "Spinning", trainer: { name: "Ana" }, confirmedCount: 2 }],
    })
  })
})

describe("POST /api/classes", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await createClass(jsonRequest("POST", validClass))

    expect(response.status).toBe(401)
    expect(mocks.classCreate).not.toHaveBeenCalled()
  })

  it("responde 403 a un miembro", async () => {
    loginAs("MEMBER")

    const response = await createClass(jsonRequest("POST", validClass))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin permisos" })
    expect(mocks.classCreate).not.toHaveBeenCalled()
  })

  it("responde 403 si quien crea no tiene gimnasio", async () => {
    loginAs("TRAINER", null)

    const response = await createClass(jsonRequest("POST", validClass))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin gimnasio asignado" })
    expect(mocks.classCreate).not.toHaveBeenCalled()
  })

  it.each([
    ["sin nombre", { ...validClass, name: "" }, "name"],
    ["capacidad 0", { ...validClass, capacity: 0 }, "capacity"],
    ["capacidad mayor a 200", { ...validClass, capacity: 201 }, "capacity"],
    ["duración menor a 15 minutos", { ...validClass, duration: 10 }, "duration"],
    ["día que no existe", { ...validClass, dayOfWeek: "LUNES" }, "dayOfWeek"],
    ["hora mal escrita", { ...validClass, startTime: "25:00" }, "startTime"],
  ])("responde 400 con %s", async (_caso, body, field) => {
    loginAs("TRAINER")

    const response = await createClass(jsonRequest("POST", body))

    expect(response.status).toBe(400)
    const json = (await response.json()) as { error: string; details: Record<string, string[]> }
    expect(json.error).toBe("Datos inválidos")
    expect(json.details[field]).toBeDefined()
    expect(mocks.classCreate).not.toHaveBeenCalled()
  })

  it("explica en español cuando la hora no tiene el formato HH:mm", async () => {
    loginAs("ADMIN")

    const response = await createClass(jsonRequest("POST", { ...validClass, startTime: "7am" }))

    const json = (await response.json()) as { details: Record<string, string[]> }
    expect(json.details.startTime).toContain("Hora inválida (HH:mm)")
  })

  it.each(["TRAINER", "ADMIN", "SUPER_ADMIN"])(
    "un %s crea la clase en su gimnasio y queda como responsable",
    async (role) => {
      loginAs(role, "gym-1", "u-staff")

      const response = await createClass(jsonRequest("POST", validClass))

      expect(response.status).toBe(201)
      expect(mocks.classCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { ...validClass, trainerId: "u-staff", gymId: "gym-1" },
        })
      )
    }
  )

  it("ignora un gymId o trainerId enviado en el cuerpo", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")

    await createClass(jsonRequest("POST", { ...validClass, gymId: "gym-2", trainerId: "u-otro" }))

    const data = mocks.classCreate.mock.calls[0][0].data
    expect(data.gymId).toBe("gym-1")
    expect(data.trainerId).toBe("u-ana")
  })
})

describe("GET /api/classes/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getClass(new Request("http://localhost/api/classes/c-1"), params())

    expect(response.status).toBe(401)
  })

  it("responde 404 si la clase no existe", async () => {
    loginAs("ADMIN")
    mocks.classFindUnique.mockResolvedValue(null)

    const response = await getClass(new Request("http://localhost/api/classes/c-x"), params("c-x"))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Clase no encontrada" })
  })

  it("un miembro no puede ver la lista de reservas de una clase", async () => {
    loginAs("MEMBER", "gym-1")
    mocks.classFindUnique.mockResolvedValue(storedClass({ bookings: [] }))

    const response = await getClass(new Request("http://localhost/api/classes/c-1"), params())

    expect(response.status).toBe(404)
  })

  it("un coach no ve la clase de otro coach aunque sea del mismo gimnasio", async () => {
    loginAs("TRAINER", "gym-1", "u-otro-coach")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await getClass(new Request("http://localhost/api/classes/c-1"), params())

    expect(response.status).toBe(404)
  })

  it("un admin no ve clases de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-2")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await getClass(new Request("http://localhost/api/classes/c-1"), params())

    expect(response.status).toBe(404)
  })

  it.each([
    ["el coach responsable", "TRAINER", "gym-1", "u-trainer"],
    ["el admin del gimnasio", "ADMIN", "gym-1", "u-admin"],
    ["el súper admin", "SUPER_ADMIN", null, "u-root"],
  ])("%s ve la clase con sus reservas", async (_quien, role, gymId, id) => {
    loginAs(role, gymId, id)
    const classItem = storedClass({ bookings: [{ id: "b-1", user: { name: "Carlos" } }] })
    mocks.classFindUnique.mockResolvedValue(classItem)

    const response = await getClass(new Request("http://localhost/api/classes/c-1"), params())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ class: classItem })
  })
})

describe("PATCH /api/classes/[id]", () => {
  const url = "http://localhost:3000/api/classes/c-1"

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateClass(jsonRequest("PATCH", { name: "Yoga" }, url), params())

    expect(response.status).toBe(401)
    expect(mocks.classUpdate).not.toHaveBeenCalled()
  })

  it("responde 404 si la clase ya fue cancelada", async () => {
    loginAs("ADMIN")
    mocks.classFindUnique.mockResolvedValue(storedClass({ active: false }))

    const response = await updateClass(jsonRequest("PATCH", { name: "Yoga" }, url), params())

    expect(response.status).toBe(404)
    expect(mocks.classUpdate).not.toHaveBeenCalled()
  })

  it("un miembro no puede editar una clase", async () => {
    loginAs("MEMBER")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await updateClass(jsonRequest("PATCH", { name: "Yoga" }, url), params())

    expect(response.status).toBe(404)
    expect(mocks.classUpdate).not.toHaveBeenCalled()
  })

  it("un coach no puede editar la clase de otro coach", async () => {
    loginAs("TRAINER", "gym-1", "u-otro-coach")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await updateClass(jsonRequest("PATCH", { name: "Yoga" }, url), params())

    expect(response.status).toBe(404)
    expect(mocks.classUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ["nombre vacío", { name: "   " }, "name"],
    ["capacidad mayor a 200", { capacity: 500 }, "capacity"],
    ["duración mayor a 240 minutos", { duration: 300 }, "duration"],
    ["hora mal escrita", { startTime: "9:5" }, "startTime"],
  ])("responde 400 con %s", async (_caso, body, field) => {
    loginAs("TRAINER", "gym-1", "u-trainer")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await updateClass(jsonRequest("PATCH", body, url), params())

    expect(response.status).toBe(400)
    const json = (await response.json()) as { error: string; details: Record<string, string[]> }
    expect(json.error).toBe("Datos inválidos")
    expect(json.details[field]).toBeDefined()
    expect(mocks.classUpdate).not.toHaveBeenCalled()
  })

  it("responde 409 si la nueva capacidad es menor a las reservas confirmadas", async () => {
    loginAs("TRAINER", "gym-1", "u-trainer")
    mocks.classFindUnique.mockResolvedValue(storedClass({ capacity: 20 }))
    mocks.bookingCount.mockResolvedValue(12)

    const response = await updateClass(jsonRequest("PATCH", { capacity: 10 }, url), params())

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: "La capacidad no puede ser menor a las 12 reservas confirmadas",
      details: { capacity: ["Capacidad insuficiente"] },
    })
    expect(mocks.classUpdate).not.toHaveBeenCalled()
  })

  it("permite bajar la capacidad si alcanza para las reservas confirmadas", async () => {
    loginAs("TRAINER", "gym-1", "u-trainer")
    mocks.classFindUnique.mockResolvedValue(storedClass({ capacity: 20 }))
    mocks.bookingCount.mockResolvedValue(8)

    const response = await updateClass(jsonRequest("PATCH", { capacity: 10 }, url), params())

    expect(response.status).toBe(200)
    expect(mocks.classUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c-1" }, data: { capacity: 10 } })
    )
  })

  it("no cuenta reservas si la capacidad sube", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.classFindUnique.mockResolvedValue(storedClass({ capacity: 20 }))

    const response = await updateClass(jsonRequest("PATCH", { capacity: 30 }, url), params())

    expect(response.status).toBe(200)
    expect(mocks.bookingCount).not.toHaveBeenCalled()
  })

  it("el admin del gimnasio edita la clase de un coach", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await updateClass(
      jsonRequest("PATCH", { name: "Spinning avanzado", startTime: "18:00" }, url),
      params()
    )

    expect(response.status).toBe(200)
    expect(mocks.classUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Spinning avanzado", startTime: "18:00" } })
    )
  })
})

describe("DELETE /api/classes/[id]", () => {
  const request = () => new Request("http://localhost:3000/api/classes/c-1", { method: "DELETE" })

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteClass(request(), params())

    expect(response.status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 404 a un admin de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-2")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await deleteClass(request(), params())

    expect(response.status).toBe(404)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 404 si la clase ya estaba cancelada", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.classFindUnique.mockResolvedValue(storedClass({ active: false }))

    const response = await deleteClass(request(), params())

    expect(response.status).toBe(404)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("desactiva la clase, cancela sus reservas y avisa a quienes habían reservado", async () => {
    loginAs("TRAINER", "gym-1", "u-trainer")
    mocks.classFindUnique.mockResolvedValue(storedClass())
    mocks.bookingFindMany.mockResolvedValue([{ userId: "u-carlos" }, { userId: "u-lucia" }])

    const response = await deleteClass(request(), params())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.bookingUpdateMany).toHaveBeenCalledWith({
      where: { classId: "c-1", status: { in: ["CONFIRMED", "ATTENDED"] } },
      data: { status: "CANCELLED" },
    })
    expect(mocks.classUpdate).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { active: false },
    })

    const notifications = mocks.notificationCreateMany.mock.calls[0][0].data
    expect(notifications).toHaveLength(2)
    expect(notifications.map((n: { userId: string }) => n.userId)).toEqual(["u-carlos", "u-lucia"])
    expect(notifications[0]).toMatchObject({
      title: "Clase cancelada",
      message: "La clase Spinning fue cancelada.",
    })
    expect(mocks.emitRealtime).toHaveBeenCalledWith("notifications", "gym-1")
  })

  it("no crea avisos si nadie había reservado", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.classFindUnique.mockResolvedValue(storedClass())

    const response = await deleteClass(request(), params())

    expect(response.status).toBe(200)
    expect(mocks.notificationCreateMany).not.toHaveBeenCalled()
  })
})
