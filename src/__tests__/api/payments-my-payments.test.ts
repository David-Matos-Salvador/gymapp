import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const paymentFindMany = vi.fn()
  return {
    userFindUnique,
    paymentFindMany,
    prisma: {
      user: { findUnique: userFindUnique },
      payment: { findMany: paymentFindMany },
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

import { GET as listMyPayments } from "@/app/api/payments/my-payments/route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userFindUnique.mockReset()
  mocks.paymentFindMany.mockReset()
  mocks.paymentFindMany.mockResolvedValue([])
})

describe("GET /api/payments/my-payments", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listMyPayments()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "No autorizado" })
    expect(mocks.paymentFindMany).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "fantasma@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await listMyPayments()

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Usuario no encontrado" })
  })

  it("solo busca los pagos del propio usuario, del más nuevo al más viejo", async () => {
    mockAuth.mockResolvedValue({ user: { email: "carlos@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue({ id: "u-carlos", role: "MEMBER", gymId: "gym-1" })

    await listMyPayments()

    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { email: "carlos@gymapp.com" } })
    expect(mocks.paymentFindMany).toHaveBeenCalledWith({
      where: { userId: "u-carlos" },
      orderBy: { createdAt: "desc" },
    })
  })

  it("devuelve las fechas en ISO y confirmedAt nulo si el pago no está confirmado", async () => {
    mockAuth.mockResolvedValue({ user: { email: "carlos@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue({ id: "u-carlos", role: "MEMBER", gymId: "gym-1" })
    mocks.paymentFindMany.mockResolvedValue([
      {
        id: "pay-2",
        userId: "u-carlos",
        status: "CONFIRMED",
        createdAt: new Date("2026-11-10T10:00:00.000Z"),
        updatedAt: new Date("2026-11-11T10:00:00.000Z"),
        confirmedAt: new Date("2026-11-11T10:00:00.000Z"),
      },
      {
        id: "pay-1",
        userId: "u-carlos",
        status: "PENDING",
        createdAt: new Date("2026-11-01T10:00:00.000Z"),
        updatedAt: new Date("2026-11-01T10:00:00.000Z"),
        confirmedAt: null,
      },
    ])

    const response = await listMyPayments()

    expect(response.status).toBe(200)
    const body = (await response.json()) as { payments: Record<string, unknown>[] }
    expect(body.payments).toEqual([
      {
        id: "pay-2",
        userId: "u-carlos",
        status: "CONFIRMED",
        createdAt: "2026-11-10T10:00:00.000Z",
        updatedAt: "2026-11-11T10:00:00.000Z",
        confirmedAt: "2026-11-11T10:00:00.000Z",
      },
      {
        id: "pay-1",
        userId: "u-carlos",
        status: "PENDING",
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-01T10:00:00.000Z",
        confirmedAt: null,
      },
    ])
  })

  it("devuelve una lista vacía si el usuario no tiene pagos", async () => {
    mockAuth.mockResolvedValue({ user: { email: "nuevo@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue({ id: "u-nuevo", role: "MEMBER", gymId: null })

    const response = await listMyPayments()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ payments: [] })
  })
})
