import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockMembershipFindFirst = vi.fn()
const mockTransaction = vi.fn()
const mockQueryRaw = vi.fn()
const mockBookingFindUnique = vi.fn()
const mockBookingCount = vi.fn()
const mockBookingCreate = vi.fn()
const mockBookingUpdate = vi.fn()

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    membership: {
      findFirst: (...args: unknown[]) => mockMembershipFindFirst(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
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

import { POST as postBooking } from "@/app/api/bookings/route"

function bookingRequest(body: unknown) {
  return new Request("http://localhost:3000/api/bookings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const booking = {
  id: "booking-1",
  userId: "user-1",
  classId: "class-1",
  status: "CONFIRMED",
}

describe("POST /api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockAuth.mockResolvedValue({ user: { email: "member@test.com" } })
    mockUserFindUnique.mockResolvedValue({ id: "user-1", role: "MEMBER", gymId: "gym-1" })
    mockMembershipFindFirst.mockResolvedValue({ id: "membership-1" })
    mockQueryRaw.mockResolvedValue([
      { id: "class-1", capacity: 1, gymId: "gym-1", trainerId: "trainer-1", active: true },
    ])
    mockBookingFindUnique.mockResolvedValue(null)
    mockBookingCount.mockResolvedValue(0)
    mockBookingCreate.mockResolvedValue(booking)
    mockBookingUpdate.mockResolvedValue({ ...booking })
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $queryRaw: mockQueryRaw,
        membership: {
          findFirst: mockMembershipFindFirst,
        },
        booking: {
          findUnique: mockBookingFindUnique,
          count: mockBookingCount,
          create: mockBookingCreate,
          update: mockBookingUpdate,
        },
      })
    )
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("No autorizado")
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("returns 404 when the session user no longer exists", async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))

    expect(response.status).toBe(404)
  })

  it("rejects an invalid classId before querying the database", async () => {
    for (const classId of [undefined, null, "", "   ", 123]) {
      const response = await postBooking(bookingRequest({ classId }))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe("classId es requerido")
    }

    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })

  it("returns 400 when the body is not valid JSON", async () => {
    const response = await postBooking(
      new Request("http://localhost:3000/api/bookings", { method: "POST", body: "{" })
    )

    expect(response.status).toBe(400)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("requires an ACTIVE, unexpired and payment-confirmed membership", async () => {
    mockMembershipFindFirst.mockResolvedValue(null)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Necesitas una membresía activa y confirmada para reservar una clase")
    expect(body.code).toBe("MEMBERSHIP_REQUIRED")
    expect(mockMembershipFindFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: "ACTIVE",
        endDate: { gt: expect.any(Date) },
        paymentConfirmed: true,
      },
      orderBy: { endDate: "desc" },
    })
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("rejects a class from another gym", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "class-1", capacity: 1, gymId: "gym-2", trainerId: "trainer-1", active: true },
    ])

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Clase no encontrada")
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("rejects booking a class taught by the same trainer", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "class-1", capacity: 1, gymId: "gym-1", trainerId: "user-1", active: true },
    ])

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("No puedes reservar una clase que dictas")
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("returns 404 when the class does not exist inside the lock", async () => {
    mockQueryRaw.mockResolvedValue([])

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Clase no encontrada")
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("returns 409 when the user already has a CONFIRMED booking", async () => {
    mockBookingFindUnique.mockResolvedValue({ ...booking, status: "CONFIRMED" })

    const response = await postBooking(bookingRequest({ classId: "class-1" }))

    expect(response.status).toBe(409)
    expect(mockBookingCreate).not.toHaveBeenCalled()
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it("returns 409 when the user already has an ATTENDED booking", async () => {
    mockBookingFindUnique.mockResolvedValue({ ...booking, status: "ATTENDED" })

    const response = await postBooking(bookingRequest({ classId: "class-1" }))

    expect(response.status).toBe(409)
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("returns 409 when the class is full", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "class-1", capacity: 1, gymId: "gym-1", trainerId: "trainer-1", active: true },
    ])
    mockBookingCount.mockResolvedValue(1)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("Clase llena")
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("creates a booking when capacity is available", async () => {
    mockQueryRaw.mockResolvedValue([
      { id: "class-1", capacity: 2, gymId: "gym-1", trainerId: "trainer-1", active: true },
    ])
    mockBookingCount.mockResolvedValue(1)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.booking).toEqual(booking)
    expect(mockBookingCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", classId: "class-1", status: "CONFIRMED" },
      include: expect.any(Object),
    })
  })

  it("reactivates a CANCELLED booking instead of inserting a duplicate", async () => {
    mockBookingFindUnique.mockResolvedValue({ ...booking, status: "CANCELLED" })
    const reactivated = { ...booking, status: "CONFIRMED" }
    mockBookingUpdate.mockResolvedValue(reactivated)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.booking).toEqual(reactivated)
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: "booking-1" },
      data: { status: "CONFIRMED" },
      include: expect.any(Object),
    })
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("does not reactivate a CANCELLED booking when the class is full", async () => {
    mockBookingFindUnique.mockResolvedValue({ ...booking, status: "CANCELLED" })
    mockBookingCount.mockResolvedValue(1)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))

    expect(response.status).toBe(409)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it("maps a P2002 unique constraint race to 409", async () => {
    mockTransaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.8.0",
      })
    )

    const response = await postBooking(bookingRequest({ classId: "class-1" }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("Ya tienes una reserva en esta clase")
  })

  it("uses an explicit transaction timeout and max wait", async () => {
    await postBooking(bookingRequest({ classId: "class-1" }))

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 10_000,
      timeout: 15_000,
    })
  })

  it("allows staff with a confirmed membership to book another trainer's class", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", role: "TRAINER", gymId: "gym-1" })

    const response = await postBooking(bookingRequest({ classId: "class-1" }))

    expect(response.status).toBe(201)
    expect(mockMembershipFindFirst).toHaveBeenCalled()
  })

  it("rejects staff without a confirmed membership", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", role: "TRAINER", gymId: "gym-1" })
    mockMembershipFindFirst.mockResolvedValue(null)

    const response = await postBooking(bookingRequest({ classId: "class-1" }))

    expect(response.status).toBe(403)
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })
})
