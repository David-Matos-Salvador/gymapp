import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const checkInFindMany = vi.fn()
  const checkInFindUnique = vi.fn()
  const checkInCreate = vi.fn()
  const checkInDelete = vi.fn()
  return {
    userFindUnique,
    checkInFindMany,
    checkInFindUnique,
    checkInCreate,
    checkInDelete,
    prisma: {
      user: { findUnique: userFindUnique },
      checkIn: {
        findMany: checkInFindMany,
        findUnique: checkInFindUnique,
        create: checkInCreate,
        delete: checkInDelete,
      },
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
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

import { GET as listCheckIns, POST as createCheckIn } from "@/app/api/check-ins/route"
import { DELETE as deleteCheckIn } from "@/app/api/check-ins/[id]/route"

const NOW = new Date("2026-11-17T08:00:00.000Z")

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId })
}

function postRequest(body: unknown) {
  return new Request("http://localhost:3000/api/check-ins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function deleteRequest(id = "ci-1") {
  return [
    new Request(`http://localhost:3000/api/check-ins/${id}`, { method: "DELETE" }),
    { params: Promise.resolve({ id }) },
  ] as const
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userFindUnique.mockReset()
  mocks.checkInFindMany.mockReset().mockResolvedValue([])
  mocks.checkInFindUnique.mockReset()
  mocks.checkInCreate
    .mockReset()
    .mockImplementation(async (args: { data: object }) => ({ id: "ci-new", ...args.data }))
  mocks.checkInDelete.mockReset().mockResolvedValue({})
})

describe("GET /api/check-ins", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listCheckIns(new Request("http://localhost:3000/api/check-ins"))

    expect(response.status).toBe(401)
    expect(mocks.checkInFindMany).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "fantasma@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await listCheckIns(new Request("http://localhost:3000/api/check-ins"))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Usuario no encontrado" })
  })

  it("solo lista los check-ins del propio usuario", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")
    mocks.checkInFindMany.mockResolvedValue([{ id: "ci-1", userId: "u-carlos" }])

    const response = await listCheckIns(new Request("http://localhost:3000/api/check-ins"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ checkIns: [{ id: "ci-1", userId: "u-carlos" }] })
    expect(mocks.checkInFindMany).toHaveBeenCalledWith({
      where: { userId: "u-carlos" },
      orderBy: { date: "desc" },
    })
  })

  it("filtra por rango de fechas cuando se envían", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")

    await listCheckIns(
      new Request("http://localhost:3000/api/check-ins?startDate=2026-11-01&endDate=2026-11-30")
    )

    expect(mocks.checkInFindMany).toHaveBeenCalledWith({
      where: {
        userId: "u-carlos",
        date: { gte: new Date("2026-11-01"), lte: new Date("2026-11-30") },
      },
      orderBy: { date: "desc" },
    })
  })

  it("acepta solo la fecha de inicio", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")

    await listCheckIns(new Request("http://localhost:3000/api/check-ins?startDate=2026-11-01"))

    expect(mocks.checkInFindMany.mock.calls[0][0].where).toEqual({
      userId: "u-carlos",
      date: { gte: new Date("2026-11-01") },
    })
  })
})

describe("POST /api/check-ins", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await createCheckIn(postRequest({}))

    expect(response.status).toBe(401)
    expect(mocks.checkInCreate).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "fantasma@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await createCheckIn(postRequest({}))

    expect(response.status).toBe(404)
    expect(mocks.checkInCreate).not.toHaveBeenCalled()
  })

  it("responde 400 si intenta registrar el check-in en otro gimnasio", async () => {
    loginAs("MEMBER", "gym-1")

    const response = await createCheckIn(postRequest({ gymId: "gym-2" }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "No puedes registrar check-in en otro gimnasio",
    })
    expect(mocks.checkInCreate).not.toHaveBeenCalled()
  })

  it("responde 400 si el usuario no tiene gimnasio y no indica uno", async () => {
    loginAs("MEMBER", null)

    const response = await createCheckIn(postRequest({}))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Sin gimnasio asignado" })
    expect(mocks.checkInCreate).not.toHaveBeenCalled()
  })

  it("registra el check-in en el gimnasio del usuario con la hora actual", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")

    const response = await createCheckIn(postRequest({}))

    expect(response.status).toBe(201)
    expect(mocks.checkInCreate).toHaveBeenCalledWith({
      data: { userId: "u-carlos", gymId: "gym-1", date: NOW },
    })
    expect(await response.json()).toEqual({
      checkIn: { id: "ci-new", userId: "u-carlos", gymId: "gym-1", date: NOW },
    })
  })

  it("acepta que envíe el id de su propio gimnasio", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")

    const response = await createCheckIn(postRequest({ gymId: "gym-1" }))

    expect(response.status).toBe(201)
    expect(mocks.checkInCreate.mock.calls[0][0].data.gymId).toBe("gym-1")
  })

  // Comportamientos dudosos encontrados al escribir estas pruebas (no se tocó el código):
  it.todo(
    "un cuerpo inválido (por ejemplo gymId numérico) debería responder 400 en español; hoy z.parse lanza y termina en 500"
  )
  it.todo(
    "un usuario sin gimnasio puede registrar check-in en cualquier gymId que envíe, sin comprobar que el gimnasio exista ni que tenga membresía allí"
  )
})

describe("DELETE /api/check-ins/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteCheckIn(...deleteRequest())

    expect(response.status).toBe(401)
    expect(mocks.checkInDelete).not.toHaveBeenCalled()
  })

  it("responde 404 si el check-in no existe", async () => {
    loginAs("MEMBER")
    mocks.checkInFindUnique.mockResolvedValue(null)

    const response = await deleteCheckIn(...deleteRequest("ci-x"))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Check-in no encontrado" })
  })

  it("el miembro borra su propio check-in", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")
    mocks.checkInFindUnique.mockResolvedValue({ id: "ci-1", userId: "u-carlos", gymId: "gym-1" })

    const response = await deleteCheckIn(...deleteRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mocks.checkInDelete).toHaveBeenCalledWith({ where: { id: "ci-1" } })
  })

  it.each(["MEMBER", "TRAINER"])(
    "responde 403 a un %s que intenta borrar el check-in de otra persona",
    async (role) => {
      loginAs(role, "gym-1", "u-otro")
      mocks.checkInFindUnique.mockResolvedValue({
        id: "ci-1",
        userId: "u-carlos",
        gymId: "gym-1",
      })

      const response = await deleteCheckIn(...deleteRequest())

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: "Sin permisos" })
      expect(mocks.checkInDelete).not.toHaveBeenCalled()
    }
  )

  it("el admin borra check-ins de su gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.checkInFindUnique.mockResolvedValue({ id: "ci-1", userId: "u-carlos", gymId: "gym-1" })

    const response = await deleteCheckIn(...deleteRequest())

    expect(response.status).toBe(200)
    expect(mocks.checkInDelete).toHaveBeenCalled()
  })

  it("el admin no ve check-ins de otro gimnasio (404)", async () => {
    loginAs("ADMIN", "gym-2")
    mocks.checkInFindUnique.mockResolvedValue({ id: "ci-1", userId: "u-carlos", gymId: "gym-1" })

    const response = await deleteCheckIn(...deleteRequest())

    expect(response.status).toBe(404)
    expect(mocks.checkInDelete).not.toHaveBeenCalled()
  })

  it("un admin sin gimnasio no puede borrar check-ins ajenos", async () => {
    loginAs("ADMIN", null)
    mocks.checkInFindUnique.mockResolvedValue({ id: "ci-1", userId: "u-carlos", gymId: "gym-1" })

    const response = await deleteCheckIn(...deleteRequest())

    expect(response.status).toBe(404)
    expect(mocks.checkInDelete).not.toHaveBeenCalled()
  })

  it("el súper admin borra cualquier check-in", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.checkInFindUnique.mockResolvedValue({ id: "ci-1", userId: "u-carlos", gymId: "gym-9" })

    const response = await deleteCheckIn(...deleteRequest())

    expect(response.status).toBe(200)
    expect(mocks.checkInDelete).toHaveBeenCalled()
  })

  it("responde 500 con mensaje en español si falla la base de datos", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")
    mocks.checkInFindUnique.mockRejectedValue(new Error("db caída"))

    const response = await deleteCheckIn(...deleteRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Error interno del servidor" })
  })
})
