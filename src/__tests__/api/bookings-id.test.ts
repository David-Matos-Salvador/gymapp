import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockBookingFindUnique = vi.fn()
const mockBookingUpdate = vi.fn()

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    booking: {
      findUnique: (...args: unknown[]) => mockBookingFindUnique(...args),
      update: (...args: unknown[]) => mockBookingUpdate(...args),
    },
  },
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json", ...init?.headers },
      })
      Object.defineProperty(response, "json", {
        value: async () => body,
      })
      return response
    }),
  },
}))

import { GET as getBooking, PATCH as updateBooking } from "@/app/api/bookings/[id]/route"

/** Reserva de Carlos en una clase del gimnasio 1 que dicta el coach u-coach. */
const booking = {
  id: "b-1",
  userId: "u-carlos",
  classId: "c-1",
  status: "CONFIRMED",
  classItem: { id: "c-1", trainerId: "u-coach", gymId: "gym-1" },
}

function loginAs(id: string, role: string, gymId: string | null = "gym-1") {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mockUserFindUnique.mockResolvedValue({ id, role, gymId })
}

function getRequest() {
  return new Request("http://localhost:3000/api/bookings/b-1")
}

function patchRequest(body: unknown) {
  return new Request("http://localhost:3000/api/bookings/b-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function routeParams(id = "b-1") {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUserFindUnique.mockReset()
  mockBookingFindUnique.mockReset()
  mockBookingUpdate.mockReset()

  mockBookingFindUnique.mockResolvedValue(booking)
  mockBookingUpdate.mockImplementation(async (args: { data: object }) => ({
    ...booking,
    ...args.data,
  }))
})

describe("GET /api/bookings/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getBooking(getRequest(), routeParams())

    expect(response.status).toBe(401)
    expect(mockBookingFindUnique).not.toHaveBeenCalled()
  })

  it("responde 404 si la reserva no existe", async () => {
    loginAs("u-carlos", "MEMBER")
    mockBookingFindUnique.mockResolvedValue(null)

    const response = await getBooking(getRequest(), routeParams("b-nada"))

    expect(response.status).toBe(404)
  })

  it.each([
    ["su dueño", "u-carlos", "MEMBER", "gym-1"],
    ["el coach que dicta la clase", "u-coach", "TRAINER", "gym-1"],
    ["el admin del gimnasio", "u-admin", "ADMIN", "gym-1"],
    ["el súper admin", "u-super", "SUPER_ADMIN", null],
  ])("la puede ver %s", async (_quien, id, role, gymId) => {
    loginAs(id, role, gymId)

    const response = await getBooking(getRequest(), routeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.booking.id).toBe("b-1")
  })

  it.each([
    ["otro miembro del mismo gimnasio", "u-ana", "MEMBER", "gym-1"],
    ["otro coach del mismo gimnasio", "u-otro-coach", "TRAINER", "gym-1"],
    ["el admin de otro gimnasio", "u-admin-2", "ADMIN", "gym-2"],
    ["un admin sin gimnasio", "u-admin-3", "ADMIN", null],
  ])("responde 404 a %s, sin revelar que existe", async (_quien, id, role, gymId) => {
    loginAs(id, role, gymId)

    const response = await getBooking(getRequest(), routeParams())
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.booking).toBeUndefined()
  })
})

describe("PATCH /api/bookings/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateBooking(patchRequest({ status: "CANCELLED" }), routeParams())

    expect(response.status).toBe(401)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it("responde 404 si la reserva no existe", async () => {
    loginAs("u-carlos", "MEMBER")
    mockBookingFindUnique.mockResolvedValue(null)

    const response = await updateBooking(
      patchRequest({ status: "CANCELLED" }),
      routeParams("b-nada")
    )

    expect(response.status).toBe(404)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it("responde 400 con un estado que no existe o sin cuerpo", async () => {
    loginAs("u-carlos", "MEMBER")

    const estadoRaro = await updateBooking(patchRequest({ status: "PAGADA" }), routeParams())
    const sinCuerpo = await updateBooking(
      new Request("http://localhost:3000/api/bookings/b-1", { method: "PATCH" }),
      routeParams()
    )

    expect(estadoRaro.status).toBe(400)
    expect(sinCuerpo.status).toBe(400)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it("el dueño puede cancelar su reserva", async () => {
    loginAs("u-carlos", "MEMBER")

    const response = await updateBooking(patchRequest({ status: "CANCELLED" }), routeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.booking.status).toBe("CANCELLED")
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "b-1" }, data: { status: "CANCELLED" } })
    )
  })

  it.each(["ATTENDED", "CONFIRMED"])("el dueño no puede ponerla en %s", async (status) => {
    loginAs("u-carlos", "MEMBER")

    const response = await updateBooking(patchRequest({ status }), routeParams())

    expect(response.status).toBe(403)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ["otro miembro", "u-ana", "MEMBER", "gym-1"],
    ["otro coach del mismo gimnasio", "u-otro-coach", "TRAINER", "gym-1"],
    ["el admin de otro gimnasio", "u-admin-2", "ADMIN", "gym-2"],
  ])("responde 403 a %s", async (_quien, id, role, gymId) => {
    loginAs(id, role, gymId)

    const response = await updateBooking(patchRequest({ status: "CANCELLED" }), routeParams())

    expect(response.status).toBe(403)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ["el coach que dicta la clase", "u-coach", "TRAINER", "gym-1"],
    ["el admin del gimnasio", "u-admin", "ADMIN", "gym-1"],
    ["el súper admin", "u-super", "SUPER_ADMIN", null],
  ])("%s puede marcar la asistencia", async (_quien, id, role, gymId) => {
    loginAs(id, role, gymId)

    const response = await updateBooking(patchRequest({ status: "ATTENDED" }), routeParams())

    expect(response.status).toBe(200)
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "b-1" }, data: { status: "ATTENDED" } })
    )
  })

  it("el coach de la clase deja de poder tocarla si la clase es de otro gimnasio", async () => {
    loginAs("u-coach", "TRAINER", "gym-2")

    const response = await updateBooking(patchRequest({ status: "ATTENDED" }), routeParams())

    expect(response.status).toBe(403)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })
})
