import { describe, it, expect, vi, beforeEach } from "vitest"

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

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId })
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
  // Apagado hasta que exista la feature con su pantalla (#225).
  it.each([
    ["sin sesión", null],
    ["un miembro", "MEMBER"],
    ["un admin", "ADMIN"],
  ])("%s recibe 404 y no se registra nada", async (_label, role) => {
    if (role) loginAs(role, "gym-1")
    else mockAuth.mockResolvedValue(null)

    const response = await createCheckIn()

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "El check-in todavía no está disponible" })
    expect(mocks.checkInCreate).not.toHaveBeenCalled()
  })
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
