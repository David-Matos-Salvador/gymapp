import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const userFindMany = vi.fn()
  const membershipFindUnique = vi.fn()
  const membershipUpdate = vi.fn()
  const paymentCreate = vi.fn()
  const paymentFindMany = vi.fn()
  const paymentCount = vi.fn()
  const trainerRequestFindMany = vi.fn()
  const notificationCreate = vi.fn()
  const transaction = vi.fn()

  const prisma = {
    user: { findUnique: userFindUnique, findMany: userFindMany },
    membership: { findUnique: membershipFindUnique, update: membershipUpdate },
    payment: { create: paymentCreate, findMany: paymentFindMany, count: paymentCount },
    trainerRequest: { findMany: trainerRequestFindMany },
    notification: { create: notificationCreate },
    $transaction: transaction,
  }

  return {
    userFindUnique,
    userFindMany,
    membershipFindUnique,
    membershipUpdate,
    paymentCreate,
    paymentFindMany,
    paymentCount,
    trainerRequestFindMany,
    notificationCreate,
    transaction,
    prisma,
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}))

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
      Object.defineProperty(response, "json", {
        value: async () => body,
      })
      return response
    }),
  },
}))

import { POST as registerManualPayment } from "@/app/api/payments/manual/route"
import { GET as listPendingPayments } from "@/app/api/payments/pending/route"
import { GET as countPendingPayments } from "@/app/api/payments/pending-count/route"

const NOW = new Date("2026-11-15T12:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId, name: id })
}

function manualRequest(body: unknown) {
  return new Request("http://localhost:3000/api/payments/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function unpaidMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    userId: "u-carlos",
    status: "ACTIVE",
    endDate: new Date(NOW.getTime() + 20 * DAY),
    paymentConfirmed: false,
    planPrice: 120,
    planCurrency: "PEN",
    plan: { id: "p-1", name: "Mensual", price: 150, currency: "PEN" },
    user: { id: "u-carlos", name: "Carlos", gymId: "gym-1" },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userFindUnique.mockReset()
  mocks.userFindMany.mockReset()
  mocks.membershipFindUnique.mockReset()
  mocks.membershipUpdate.mockReset()
  mocks.paymentCreate.mockReset()
  mocks.paymentFindMany.mockReset()
  mocks.paymentCount.mockReset()
  mocks.trainerRequestFindMany.mockReset()
  mocks.notificationCreate.mockReset()
  mocks.transaction.mockReset()

  mocks.transaction.mockImplementation(async (fn: (tx: typeof mocks.prisma) => unknown) =>
    fn(mocks.prisma)
  )
  mocks.paymentCreate.mockImplementation(async (args: { data: object }) => ({
    id: "pay-1",
    ...args.data,
  }))
  mocks.membershipUpdate.mockImplementation(async (args: { data: object }) => ({
    id: "m-1",
    ...args.data,
  }))
  mocks.notificationCreate.mockResolvedValue({})
  mocks.paymentFindMany.mockResolvedValue([])
  mocks.paymentCount.mockResolvedValue(0)
  mocks.userFindMany.mockResolvedValue([])
  mocks.trainerRequestFindMany.mockResolvedValue([])
})

describe("POST /api/payments/manual", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    expect(response.status).toBe(401)
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })

  it.each(["MEMBER", "TRAINER"])("responde 403 a un %s", async (role) => {
    loginAs(role)

    const response = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    expect(response.status).toBe(403)
    expect(mocks.membershipFindUnique).not.toHaveBeenCalled()
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })

  it("responde 400 si falta la membresía o el método no existe", async () => {
    loginAs("ADMIN")

    const sinMembresia = await registerManualPayment(manualRequest({ method: "CASH" }))
    const metodoRaro = await registerManualPayment(
      manualRequest({ membershipId: "m-1", method: "BITCOIN" })
    )

    expect(sinMembresia.status).toBe(400)
    expect(metodoRaro.status).toBe(400)
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })

  it("responde 404 si la membresía no existe", async () => {
    loginAs("ADMIN")
    mocks.membershipFindUnique.mockResolvedValue(null)

    const response = await registerManualPayment(manualRequest({ membershipId: "m-nada" }))

    expect(response.status).toBe(404)
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })

  it("no deja a un admin registrar pagos de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.membershipFindUnique.mockResolvedValue(
      unpaidMembership({ user: { id: "u-ana", name: "Ana", gymId: "gym-2" } })
    )

    const response = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    expect(response.status).toBe(403)
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
    expect(mocks.membershipUpdate).not.toHaveBeenCalled()
  })

  it("responde 409 si la membresía está vencida", async () => {
    loginAs("ADMIN")

    mocks.membershipFindUnique.mockResolvedValue(unpaidMembership({ status: "EXPIRED" }))
    const porEstado = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    mocks.membershipFindUnique.mockResolvedValue(
      unpaidMembership({ endDate: new Date(NOW.getTime() - DAY) })
    )
    const porFecha = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    expect(porEstado.status).toBe(409)
    expect(porFecha.status).toBe(409)
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si la membresía ya está pagada", async () => {
    loginAs("ADMIN")
    mocks.membershipFindUnique.mockResolvedValue(unpaidMembership({ paymentConfirmed: true }))

    const response = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    expect(response.status).toBe(409)
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })

  it("registra el pago con el precio guardado en la membresía y la deja pagada", async () => {
    loginAs("ADMIN", "gym-1", "u-admin")
    mocks.membershipFindUnique.mockResolvedValue(unpaidMembership())

    const response = await registerManualPayment(
      manualRequest({ membershipId: "m-1", method: "YAPE", reference: "OP-99" })
    )

    expect(response.status).toBe(201)
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: {
        userId: "u-carlos",
        membershipId: "m-1",
        amount: 120,
        currency: "PEN",
        status: "COMPLETED",
        method: "YAPE",
        type: "MEMBERSHIP",
        reference: "OP-99",
        confirmedById: "u-admin",
        confirmedAt: NOW,
      },
    })
    expect(mocks.membershipUpdate).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: { paymentConfirmed: true, paymentMethod: "YAPE", paymentRef: "OP-99" },
    })
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u-carlos",
        type: "PAYMENT",
        metadata: { paymentId: "pay-1", membershipId: "m-1" },
      }),
    })
  })

  it("usa efectivo por defecto y el precio del plan si la membresía no guardó el suyo", async () => {
    loginAs("ADMIN")
    mocks.membershipFindUnique.mockResolvedValue(
      unpaidMembership({ planPrice: null, planCurrency: null })
    )

    const response = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    expect(response.status).toBe(201)
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 150,
        currency: "PEN",
        method: "CASH",
        reference: null,
      }),
    })
  })

  it("deja al súper admin registrar el pago de cualquier gimnasio", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.membershipFindUnique.mockResolvedValue(
      unpaidMembership({ user: { id: "u-ana", name: "Ana", gymId: "gym-2" } })
    )

    const response = await registerManualPayment(manualRequest({ membershipId: "m-1" }))

    expect(response.status).toBe(201)
    expect(mocks.paymentCreate).toHaveBeenCalledTimes(1)
  })
})

describe("GET /api/payments/pending", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listPendingPayments()

    expect(response.status).toBe(401)
    expect(mocks.paymentFindMany).not.toHaveBeenCalled()
  })

  it("responde 403 a un miembro", async () => {
    loginAs("MEMBER")

    const response = await listPendingPayments()

    expect(response.status).toBe(403)
    expect(mocks.paymentFindMany).not.toHaveBeenCalled()
  })

  it("el coach sin gimnasio o sin clientes recibe una lista vacía", async () => {
    loginAs("TRAINER", null)
    const sinGimnasio = await listPendingPayments()

    loginAs("TRAINER", "gym-1")
    mocks.userFindMany.mockResolvedValue([])
    const sinClientes = await listPendingPayments()

    expect(await sinGimnasio.json()).toEqual({ payments: [] })
    expect(await sinClientes.json()).toEqual({ payments: [] })
    expect(mocks.paymentFindMany).not.toHaveBeenCalled()
  })

  it("el coach solo ve pagos pendientes de sus clientes asignados en su gimnasio", async () => {
    loginAs("TRAINER", "gym-1", "u-coach")
    mocks.userFindMany.mockResolvedValue([{ id: "u-carlos" }, { id: "u-ana" }])
    mocks.paymentFindMany.mockResolvedValue([{ id: "pay-1", userId: "u-carlos" }])

    const response = await listPendingPayments()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.payments).toEqual([{ id: "pay-1", userId: "u-carlos" }])
    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: { assignedTrainerId: "u-coach", gymId: "gym-1", deletedAt: null },
      select: { id: true },
    })
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING", userId: { in: ["u-carlos", "u-ana"] } },
      })
    )
  })

  it("el admin solo ve los pagos pendientes de su gimnasio", async () => {
    loginAs("ADMIN", "gym-1")

    const response = await listPendingPayments()

    expect(response.status).toBe(200)
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING", user: { gymId: "gym-1" } } })
    )
  })

  it("un admin sin gimnasio no ve pagos de ningún gimnasio", async () => {
    loginAs("ADMIN", null)

    await listPendingPayments()

    expect(mocks.paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING", user: { gymId: "__no_gym__" } } })
    )
  })

  it("el súper admin ve los pagos pendientes de todos los gimnasios", async () => {
    loginAs("SUPER_ADMIN", null)

    await listPendingPayments()

    expect(mocks.paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING" } })
    )
  })
})

describe("GET /api/payments/pending-count", () => {
  it("responde 0 sin sesión y a un miembro, sin contar nada", async () => {
    mockAuth.mockResolvedValue(null)
    const sinSesion = await countPendingPayments()

    loginAs("MEMBER")
    const miembro = await countPendingPayments()

    expect(await sinSesion.json()).toEqual({ count: 0 })
    expect(await miembro.json()).toEqual({ count: 0 })
    expect(mocks.paymentCount).not.toHaveBeenCalled()
  })

  it("el coach sin clientes recibe 0", async () => {
    loginAs("TRAINER")

    const response = await countPendingPayments()

    expect(await response.json()).toEqual({ count: 0 })
    expect(mocks.paymentCount).not.toHaveBeenCalled()
  })

  it("el coach cuenta los pagos de sus clientes sin repetirlos", async () => {
    loginAs("TRAINER", "gym-1", "u-coach")
    mocks.trainerRequestFindMany.mockResolvedValue([{ clientId: "u-carlos" }])
    mocks.userFindMany.mockResolvedValue([{ id: "u-carlos" }, { id: "u-ana" }])
    mocks.paymentCount.mockResolvedValue(3)

    const response = await countPendingPayments()

    expect(await response.json()).toEqual({ count: 3 })
    expect(mocks.paymentCount).toHaveBeenCalledWith({
      where: { status: "PENDING", userId: { in: ["u-carlos", "u-ana"] } },
    })
  })

  it("el admin cuenta solo los pagos de su gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.paymentCount.mockResolvedValue(2)

    const response = await countPendingPayments()

    expect(await response.json()).toEqual({ count: 2 })
    expect(mocks.paymentCount).toHaveBeenCalledWith({
      where: { status: "PENDING", user: { gymId: "gym-1" } },
    })
  })

  it("el súper admin cuenta los pagos de todos los gimnasios", async () => {
    loginAs("SUPER_ADMIN", null)

    await countPendingPayments()

    expect(mocks.paymentCount).toHaveBeenCalledWith({ where: { status: "PENDING" } })
  })

  it.todo(
    "el contador del coach usa el mismo criterio que la lista: hoy suma clientes con solicitud aceptada y no filtra por gimnasio, y la lista (y la revisión del pago) solo aceptan clientes asignados del mismo gimnasio, así que el globo puede mostrar más pagos de los que el coach puede ver"
  )
})
