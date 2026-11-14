import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const userUpdate = vi.fn()
  const membershipFindUnique = vi.fn()
  const membershipFindMany = vi.fn()
  const membershipUpdate = vi.fn()
  const membershipUpdateMany = vi.fn()
  const paymentFindUnique = vi.fn()
  const paymentFindFirst = vi.fn()
  const paymentCreate = vi.fn()
  const paymentUpdateMany = vi.fn()
  const trainerRequestFindFirst = vi.fn()
  const trainerRequestUpdateMany = vi.fn()
  const notificationCreate = vi.fn()
  const transaction = vi.fn()

  const prisma = {
    user: {
      findUnique: userFindUnique,
      update: userUpdate,
    },
    membership: {
      findUnique: membershipFindUnique,
      findMany: membershipFindMany,
      update: membershipUpdate,
      updateMany: membershipUpdateMany,
    },
    payment: {
      findUnique: paymentFindUnique,
      findFirst: paymentFindFirst,
      create: paymentCreate,
      updateMany: paymentUpdateMany,
    },
    trainerRequest: {
      findFirst: trainerRequestFindFirst,
      updateMany: trainerRequestUpdateMany,
    },
    notification: {
      create: notificationCreate,
    },
    $transaction: transaction,
  }

  return {
    userFindUnique,
    userUpdate,
    membershipFindUnique,
    membershipFindMany,
    membershipUpdate,
    membershipUpdateMany,
    paymentFindUnique,
    paymentFindFirst,
    paymentCreate,
    paymentUpdateMany,
    trainerRequestFindFirst,
    trainerRequestUpdateMany,
    notificationCreate,
    transaction,
    prisma,
  }
})

const mockUserFindUnique = mocks.userFindUnique
const mockUserUpdate = mocks.userUpdate
const mockMembershipFindUnique = mocks.membershipFindUnique
const mockMembershipFindMany = mocks.membershipFindMany
const mockMembershipUpdate = mocks.membershipUpdate
const mockMembershipUpdateMany = mocks.membershipUpdateMany
const mockPaymentFindUnique = mocks.paymentFindUnique
const mockPaymentFindFirst = mocks.paymentFindFirst
const mockPaymentCreate = mocks.paymentCreate
const mockPaymentUpdateMany = mocks.paymentUpdateMany
const mockTrainerRequestFindFirst = mocks.trainerRequestFindFirst
const mockTrainerRequestUpdateMany = mocks.trainerRequestUpdateMany
const mockNotificationCreate = mocks.notificationCreate
const mockTransaction = mocks.transaction
const mockPrisma = mocks.prisma
const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/realtime", () => ({
  emitRealtime: vi.fn(),
}))

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
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

import { POST as uploadReceipt } from "@/app/api/payments/receipt/route"
import { PUT as reviewPayment } from "@/app/api/payments/[id]/route"

const adminUser = {
  id: "admin-1",
  email: "admin@gymapp.com",
  role: "ADMIN",
  name: "Admin",
  gymId: "gym-1",
}

const receiptFile = {
  name: "comprobante.png",
  type: "image/png",
  size: 128,
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
}

function uploadRequest(includeFile = true, method = "TRANSFER") {
  const values = new Map<string, unknown>([
    ["membershipId", "membership-1"],
    ["method", method],
  ])
  if (method === "TRANSFER") values.set("reference", "REF-123")
  if (includeFile) values.set("file", receiptFile)

  return {
    formData: async () => ({
      get: (key: string) => values.get(key) ?? null,
    }),
  } as unknown as Request
}

function reviewRequest(action: "CONFIRM" | "REJECT") {
  return {
    json: async () => ({ action }),
  } as unknown as Request
}

function reviewParams(id = "payment-1") {
  return { params: Promise.resolve({ id }) }
}

function pendingMembershipPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    userId: "client-1",
    amount: 120,
    currency: "PEN",
    status: "PENDING",
    method: "TRANSFER",
    type: "MEMBERSHIP",
    reference: "REF-123",
    receiptUrl: "/uploads/receipts/comprobante.png",
    user: {
      id: "client-1",
      name: "Client",
      email: "client@example.com",
      gymId: "gym-1",
      assignedTrainerId: null,
    },
    ...overrides,
  }
}

function mockReviewAuth(role = "ADMIN") {
  mockAuth.mockResolvedValue({ user: { email: "admin@gymapp.com" } })
  mockUserFindUnique.mockImplementation(
    async (args: { where: { email?: string; id?: string } }) => {
      if (args.where.email) return { ...adminUser, role }
      return { id: "client-1", assignedTrainerId: null, name: "Client", gymId: "gym-1" }
    }
  )
  mockTrainerRequestFindFirst.mockResolvedValue(null)
  mockNotificationCreate.mockResolvedValue({})
  mockUserUpdate.mockResolvedValue({})
  mockTrainerRequestUpdateMany.mockResolvedValue({ count: 1 })
}

beforeEach(() => {
  vi.clearAllMocks()

  mockUserFindUnique.mockReset()
  mockUserUpdate.mockReset()
  mockMembershipFindUnique.mockReset()
  mockMembershipFindMany.mockReset()
  mockMembershipUpdate.mockReset()
  mockMembershipUpdateMany.mockReset()
  mockPaymentFindUnique.mockReset()
  mockPaymentFindFirst.mockReset()
  mockPaymentCreate.mockReset()
  mockPaymentUpdateMany.mockReset()
  mockTrainerRequestFindFirst.mockReset()
  mockTrainerRequestUpdateMany.mockReset()
  mockNotificationCreate.mockReset()
  mockTransaction.mockReset()

  mockTransaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: typeof mockPrisma) => unknown)(mockPrisma)
    }
    return Promise.all(arg as Promise<unknown>[])
  })
  mockMembershipFindMany.mockResolvedValue([])
  mockPaymentFindFirst.mockResolvedValue(null)
  mockPaymentUpdateMany.mockResolvedValue({ count: 1 })
  mockMembershipUpdateMany.mockResolvedValue({ count: 1 })
})

describe("POST /api/payments/receipt", () => {
  it("creates a PENDING MEMBERSHIP payment without confirming the membership", async () => {
    mockAuth.mockResolvedValue({ user: { email: "valentina@gymapp.com" } })
    mockUserFindUnique.mockResolvedValue({
      id: "client-1",
      email: "valentina@gymapp.com",
      name: "Valentina",
      gymId: "gym-1",
    })
    mockMembershipFindUnique.mockResolvedValue({
      id: "membership-1",
      userId: "client-1",
      paymentConfirmed: false,
      status: "ACTIVE",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2099-02-01"),
      plan: { price: 120, currency: "PEN", gymId: "gym-1" },
    })
    mockPaymentCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "payment-1",
      ...data,
    }))
    mockTrainerRequestFindFirst.mockResolvedValue(null)

    const response = await uploadReceipt(uploadRequest())
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.payment.status).toBe("PENDING")
    expect(mockPaymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "client-1",
        amount: 120,
        currency: "PEN",
        status: "PENDING",
        type: "MEMBERSHIP",
        method: "TRANSFER",
        reference: "REF-123",
      }),
    })
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
    expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("requires a receipt file", async () => {
    mockAuth.mockResolvedValue({ user: { email: "valentina@gymapp.com" } })
    mockUserFindUnique.mockResolvedValue({ id: "client-1", email: "valentina@gymapp.com" })

    const response = await uploadReceipt(uploadRequest(false))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Comprobante requerido")
    expect(mockPaymentCreate).not.toHaveBeenCalled()
  })

  it("Yape sin comprobante también se rechaza", async () => {
    mockAuth.mockResolvedValue({ user: { email: "valentina@gymapp.com" } })
    mockUserFindUnique.mockResolvedValue({ id: "client-1", email: "valentina@gymapp.com" })

    const response = await uploadReceipt(uploadRequest(false, "YAPE"))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("Comprobante requerido")
    expect(mockPaymentCreate).not.toHaveBeenCalled()
  })

  // #108: efectivo y tarjeta se pagan en recepción. No hay comprobante que subir: el pago queda
  // pendiente y lo confirma quien recibió el dinero.
  describe.each([
    ["CASH", "en efectivo"],
    ["CARD", "con tarjeta"],
  ])("pago en recepción (%s)", (method, how) => {
    function mockMemberWithCoach() {
      mockAuth.mockResolvedValue({ user: { email: "valentina@gymapp.com" } })
      mockUserFindUnique.mockImplementation(
        async (args: { where: { email?: string; id?: string } }) =>
          args.where.email
            ? {
                id: "client-1",
                email: "valentina@gymapp.com",
                name: "Valentina",
                gymId: "gym-1",
                assignedTrainerId: "trainer-1",
              }
            : { id: "trainer-1", name: "Coach", gymId: "gym-1" }
      )
      mockMembershipFindUnique.mockResolvedValue({
        id: "membership-1",
        userId: "client-1",
        paymentConfirmed: false,
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2099-02-01"),
        plan: { price: 120, currency: "PEN", gymId: "gym-1" },
      })
      mockPaymentCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "payment-1",
        ...data,
      }))
      mockNotificationCreate.mockResolvedValue({})
    }

    it("no pide comprobante: crea el pago PENDING sin captura y no confirma la membresía", async () => {
      mockMemberWithCoach()

      const response = await uploadReceipt(uploadRequest(false, method))
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.payment.status).toBe("PENDING")
      expect(mockPaymentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "client-1",
          membershipId: "membership-1",
          status: "PENDING",
          type: "MEMBERSHIP",
          method,
          receiptUrl: null,
        }),
      })
      expect(mockMembershipUpdate).not.toHaveBeenCalled()
      expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
    })

    it("avisa al coach que hay un pago por confirmar, sin hablar de comprobante", async () => {
      mockMemberWithCoach()

      await uploadReceipt(uploadRequest(false, method))

      const notification = mockNotificationCreate.mock.calls[0][0].data
      expect(notification.userId).toBe("trainer-1")
      expect(notification.title).toBe("Pago por confirmar")
      expect(notification.message).toContain(`${how} en recepción`)
      expect(notification.message).not.toMatch(/subió un comprobante/)
    })

    it("no guarda la captura aunque llegue un archivo", async () => {
      mockMemberWithCoach()

      const response = await uploadReceipt(uploadRequest(true, method))

      expect(response.status).toBe(201)
      expect(mockPaymentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ receiptUrl: null }),
      })
    })
  })
})

describe("avisos al miembro al revisar un pago sin comprobante (#108)", () => {
  it("al confirmar no le dice que se verificó un comprobante", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment({ method: "CASH", receiptUrl: null }))
      .mockResolvedValueOnce(pendingMembershipPayment({ status: "COMPLETED" }))
    mockMembershipFindMany.mockResolvedValue([{ id: "membership-1" }])

    const response = await reviewPayment(reviewRequest("CONFIRM"), reviewParams())

    expect(response.status).toBe(200)
    const notification = mockNotificationCreate.mock.calls[0][0].data
    expect(notification.title).toBe("Pago confirmado")
    expect(notification.message).toBe("El gimnasio confirmó tu pago. ¡Tu membresía está activa!")
  })

  it("al confirmar un pago con captura mantiene el aviso del comprobante", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment())
      .mockResolvedValueOnce(pendingMembershipPayment({ status: "COMPLETED" }))
    mockMembershipFindMany.mockResolvedValue([{ id: "membership-1" }])

    await reviewPayment(reviewRequest("CONFIRM"), reviewParams())

    expect(mockNotificationCreate.mock.calls[0][0].data.message).toMatch(/comprobante de pago/)
  })

  it("al rechazar sin motivo lo manda a recepción", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment({ method: "CASH", receiptUrl: null }))
      .mockResolvedValueOnce(pendingMembershipPayment({ status: "FAILED" }))

    const response = await reviewPayment(reviewRequest("REJECT"), reviewParams())

    expect(response.status).toBe(200)
    expect(mockNotificationCreate.mock.calls[0][0].data.message).toBe(
      "El gimnasio no pudo confirmar tu pago. Consulta en recepción."
    )
  })
})

describe("PUT /api/payments/[id] CONFIRM", () => {
  it("completes the payment and confirms the unconfirmed membership without changing status or dates", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment())
      .mockResolvedValueOnce(pendingMembershipPayment({ status: "COMPLETED" }))
    mockMembershipFindMany.mockResolvedValue([{ id: "membership-1" }])

    const response = await reviewPayment(reviewRequest("CONFIRM"), reviewParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.payment.status).toBe("COMPLETED")
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: "PENDING" },
      data: expect.objectContaining({
        status: "COMPLETED",
        confirmedById: "admin-1",
      }),
    })
    expect(mockMembershipUpdateMany).toHaveBeenCalledWith({
      where: { id: "membership-1", paymentConfirmed: false },
      data: {
        paymentConfirmed: true,
        paymentMethod: "TRANSFER",
        paymentRef: "REF-123",
      },
    })

    const membershipData = mockMembershipUpdateMany.mock.calls[0][0].data
    expect(membershipData).not.toHaveProperty("status")
    expect(membershipData).not.toHaveProperty("startDate")
    expect(membershipData).not.toHaveProperty("endDate")
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("is a no-op for an already-confirmed membership (Mateo) and never revokes it", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment({ userId: "mateo-1" }))
      .mockResolvedValueOnce(pendingMembershipPayment({ userId: "mateo-1", status: "COMPLETED" }))
    mockMembershipFindMany.mockResolvedValue([])

    const response = await reviewPayment(reviewRequest("CONFIRM"), reviewParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.payment.status).toBe("COMPLETED")
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: "PENDING" },
      data: expect.objectContaining({ status: "COMPLETED" }),
    })
    expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("does not touch memberships for non-MEMBERSHIP payments", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment({ type: "CLASS_BOOKING" }))
      .mockResolvedValueOnce(
        pendingMembershipPayment({ type: "CLASS_BOOKING", status: "COMPLETED" })
      )

    const response = await reviewPayment(reviewRequest("CONFIRM"), reviewParams())

    expect(response.status).toBe(200)
    expect(mockMembershipFindMany).not.toHaveBeenCalled()
    expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("returns 409 when more than one unconfirmed membership matches", async () => {
    mockReviewAuth()
    mockPaymentFindUnique.mockResolvedValueOnce(pendingMembershipPayment())
    mockMembershipFindMany.mockResolvedValue([{ id: "membership-1" }, { id: "membership-2" }])

    const response = await reviewPayment(reviewRequest("CONFIRM"), reviewParams())
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toMatch(/más de una membresía/i)
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled()
    expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
  })
})

describe("PUT /api/payments/[id] REJECT", () => {
  it("marks the payment FAILED and leaves an unconfirmed membership untouched", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment())
      .mockResolvedValueOnce(pendingMembershipPayment({ status: "FAILED" }))
    mockMembershipFindMany.mockResolvedValue([{ id: "membership-1" }])

    const response = await reviewPayment(reviewRequest("REJECT"), reviewParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.payment.status).toBe("FAILED")
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { id: "payment-1", status: "PENDING" },
      data: expect.objectContaining({ status: "FAILED", confirmedById: "admin-1" }),
    })
    expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it("never revokes an already-confirmed membership", async () => {
    mockReviewAuth()
    mockPaymentFindUnique
      .mockResolvedValueOnce(pendingMembershipPayment())
      .mockResolvedValueOnce(pendingMembershipPayment({ status: "FAILED" }))
    mockMembershipFindMany.mockResolvedValue([])

    const response = await reviewPayment(reviewRequest("REJECT"), reviewParams())

    expect(response.status).toBe(200)
    expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })
})

describe("PUT /api/payments/[id] transitions", () => {
  it.each(["CONFIRM", "REJECT"] as const)(
    "returns 409 when the payment is already processed (%s)",
    async (action) => {
      mockReviewAuth()
      mockPaymentFindUnique.mockResolvedValueOnce(pendingMembershipPayment({ status: "COMPLETED" }))

      const response = await reviewPayment(reviewRequest(action), reviewParams())
      const body = await response.json()

      expect(response.status).toBe(409)
      expect(body.error).toBe("Este pago ya fue procesado")
      expect(mockPaymentUpdateMany).not.toHaveBeenCalled()
      expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
    }
  )

  it("returns 409 when a concurrent request claimed the payment first", async () => {
    mockReviewAuth()
    mockPaymentFindUnique.mockResolvedValueOnce(pendingMembershipPayment())
    mockMembershipFindMany.mockResolvedValue([{ id: "membership-1" }])
    mockPaymentUpdateMany.mockResolvedValue({ count: 0 })

    const response = await reviewPayment(reviewRequest("CONFIRM"), reviewParams())
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("Este pago ya fue procesado")
    expect(mockMembershipUpdateMany).not.toHaveBeenCalled()
  })
})
