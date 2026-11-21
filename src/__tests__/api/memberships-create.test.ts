import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const planFindUnique = vi.fn()
  const membershipFindFirst = vi.fn()
  const membershipCreate = vi.fn()

  const prisma = {
    user: { findUnique: userFindUnique },
    membershipPlan: { findUnique: planFindUnique },
    membership: { findFirst: membershipFindFirst, create: membershipCreate },
  }

  return { userFindUnique, planFindUnique, membershipFindFirst, membershipCreate, prisma }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

import { GET as getMyMembership, POST as assignMembership } from "@/app/api/memberships/route"
import { POST as takeFreePlan } from "@/app/api/memberships/self/route"

const NOW = new Date("2026-11-15T12:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

const plan = {
  id: "p-1",
  gymId: "gym-1",
  name: "Mensual",
  price: 120,
  currency: "PEN",
  durationDays: 30,
  active: true,
}

const freePlan = { ...plan, id: "p-gratis", name: "Prueba gratis", price: 0, durationDays: 7 }

/** El usuario con sesión se busca por correo; el miembro al que se le asigna, por id. */
function loginAs(
  role: string,
  gymId: string | null = "gym-1",
  target: { id: string; gymId: string | null } | null = { id: "u-carlos", gymId: "gym-1" }
) {
  const id = `u-${role.toLowerCase()}`
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockImplementation(
    async (args: { where: { email?: string; id?: string } }) => {
      if (args.where.email) return { id, role, gymId }
      return target
    }
  )
}

function postRequest(path: string, body: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function duplicateError() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userFindUnique.mockReset()
  mocks.planFindUnique.mockReset()
  mocks.membershipFindFirst.mockReset()
  mocks.membershipCreate.mockReset()

  vi.useFakeTimers()
  vi.setSystemTime(NOW)

  mocks.planFindUnique.mockResolvedValue(plan)
  mocks.membershipFindFirst.mockResolvedValue(null)
  mocks.membershipCreate.mockImplementation(async (args: { data: object }) => ({
    id: "m-nueva",
    ...args.data,
  }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("GET /api/memberships", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getMyMembership()

    expect(response.status).toBe(401)
    expect(mocks.membershipFindFirst).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await getMyMembership()

    expect(response.status).toBe(404)
  })

  it("devuelve solo la membresía más reciente de quien pregunta", async () => {
    loginAs("MEMBER")
    mocks.membershipFindFirst.mockResolvedValue({ id: "m-1", userId: "u-member" })

    const response = await getMyMembership()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.membership).toEqual({ id: "m-1", userId: "u-member" })
    expect(mocks.membershipFindFirst).toHaveBeenCalledWith({
      where: { userId: "u-member" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    })
  })
})

describe("POST /api/memberships", () => {
  const body = { userId: "u-carlos", planId: "p-1" }

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(401)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it.each(["MEMBER", "TRAINER"])("responde 403 a un %s", async (role) => {
    loginAs(role)

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(403)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 400 si falta el miembro o el plan", async () => {
    loginAs("ADMIN")

    const response = await assignMembership(postRequest("/api/memberships", { planId: "p-1" }))

    expect(response.status).toBe(400)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 400 si se registra a mano como pagada con Stripe (#186)", async () => {
    loginAs("ADMIN")

    const response = await assignMembership(
      postRequest("/api/memberships", { userId: "u-1", planId: "p-1", paymentMethod: "STRIPE" })
    )

    expect(response.status).toBe(400)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 404 si el plan no existe", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue(null)

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(404)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si el plan está inactivo", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue({ ...plan, active: false })

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(409)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 404 si el miembro no existe", async () => {
    loginAs("ADMIN", "gym-1", null)

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(404)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("no deja a un admin dar una membresía a un miembro de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1", { id: "u-ana", gymId: "gym-2" })

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(403)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("no deja a un admin usar el plan de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.planFindUnique.mockResolvedValue({ ...plan, gymId: "gym-2" })

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(403)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si el miembro ya tiene una membresía vigente", async () => {
    loginAs("ADMIN")
    mocks.membershipFindFirst.mockResolvedValue({ id: "m-vigente" })

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(409)
    expect(mocks.membershipFindFirst).toHaveBeenCalledWith({
      where: { userId: "u-carlos", status: "ACTIVE", endDate: { gt: NOW } },
      select: { id: true },
    })
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si ya existe una membresía para ese miembro y plan", async () => {
    loginAs("ADMIN")
    mocks.membershipCreate.mockRejectedValue(duplicateError())

    const response = await assignMembership(postRequest("/api/memberships", body))

    expect(response.status).toBe(409)
  })

  it("crea la membresía sin confirmar el pago y guarda el precio del plan", async () => {
    loginAs("ADMIN")

    const response = await assignMembership(
      postRequest("/api/memberships", { ...body, paymentMethod: "YAPE" })
    )

    expect(response.status).toBe(201)
    expect(mocks.membershipCreate).toHaveBeenCalledWith({
      data: {
        userId: "u-carlos",
        planId: "p-1",
        startDate: NOW,
        endDate: new Date(NOW.getTime() + 30 * DAY),
        paymentRef: undefined,
        notes: undefined,
        autoRenew: false,
        paymentConfirmed: false,
        paymentMethod: "YAPE",
        planPrice: 120,
        planCurrency: "PEN",
        planDurationDays: 30,
      },
      include: { plan: true },
    })
  })

  it("un plan gratis queda pagado desde el inicio", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue(freePlan)

    const response = await assignMembership(
      postRequest("/api/memberships", { userId: "u-carlos", planId: "p-gratis" })
    )

    expect(response.status).toBe(201)
    expect(mocks.membershipCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentConfirmed: true, paymentMethod: "OTHER" }),
      })
    )
  })

  it("el súper admin puede dar membresías en cualquier gimnasio", async () => {
    loginAs("SUPER_ADMIN", null, { id: "u-ana", gymId: "gym-2" })
    mocks.planFindUnique.mockResolvedValue({ ...plan, gymId: "gym-2" })

    const response = await assignMembership(
      postRequest("/api/memberships", { userId: "u-ana", planId: "p-1" })
    )

    expect(response.status).toBe(201)
  })

  it.todo(
    "el súper admin no puede dar a un miembro el plan de un gimnasio que no es el suyo: hoy la ruta solo compara gimnasios cuando quien asigna es ADMIN"
  )
})

describe("POST /api/memberships/self", () => {
  const body = { planId: "p-gratis" }

  beforeEach(() => {
    mocks.planFindUnique.mockResolvedValue(freePlan)
  })

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await takeFreePlan(postRequest("/api/memberships/self", body))

    expect(response.status).toBe(401)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it.each(["TRAINER", "ADMIN", "SUPER_ADMIN"])("responde 403 a un %s", async (role) => {
    loginAs(role)

    const response = await takeFreePlan(postRequest("/api/memberships/self", body))

    expect(response.status).toBe(403)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 403 a un miembro sin gimnasio", async () => {
    loginAs("MEMBER", null)

    const response = await takeFreePlan(postRequest("/api/memberships/self", body))

    expect(response.status).toBe(403)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 400 sin planId", async () => {
    loginAs("MEMBER")

    const response = await takeFreePlan(postRequest("/api/memberships/self", {}))

    expect(response.status).toBe(400)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it.each([
    ["no existe", null],
    ["está inactivo", { ...freePlan, active: false }],
    ["es de otro gimnasio", { ...freePlan, gymId: "gym-2" }],
    ["no está en soles", { ...freePlan, currency: "USD" }],
  ])("responde 404 si el plan %s", async (_caso, found) => {
    loginAs("MEMBER")
    mocks.planFindUnique.mockResolvedValue(found)

    const response = await takeFreePlan(postRequest("/api/memberships/self", body))

    expect(response.status).toBe(404)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("no deja activar por esta vía un plan de pago", async () => {
    loginAs("MEMBER")
    mocks.planFindUnique.mockResolvedValue(plan)

    const response = await takeFreePlan(postRequest("/api/memberships/self", { planId: "p-1" }))

    expect(response.status).toBe(400)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si ya tiene una membresía vigente", async () => {
    loginAs("MEMBER")
    mocks.membershipFindFirst.mockResolvedValue({ id: "m-vigente" })

    const response = await takeFreePlan(postRequest("/api/memberships/self", body))

    expect(response.status).toBe(409)
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si ya usó ese plan", async () => {
    loginAs("MEMBER")
    mocks.membershipCreate.mockRejectedValue(duplicateError())

    const response = await takeFreePlan(postRequest("/api/memberships/self", body))

    expect(response.status).toBe(409)
  })

  it("activa el plan gratis para quien lo pide, ya pagado", async () => {
    loginAs("MEMBER")

    const response = await takeFreePlan(postRequest("/api/memberships/self", body))

    expect(response.status).toBe(201)
    expect(mocks.membershipCreate).toHaveBeenCalledWith({
      data: {
        userId: "u-member",
        planId: "p-gratis",
        status: "ACTIVE",
        startDate: NOW,
        endDate: new Date(NOW.getTime() + 7 * DAY),
        paymentConfirmed: true,
        paymentMethod: "OTHER",
        planPrice: 0,
        planCurrency: "PEN",
        planDurationDays: 7,
      },
      include: { plan: true },
    })
  })
})
