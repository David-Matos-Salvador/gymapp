import { readFileSync } from "fs"
import { join } from "path"
import { describe, it, expect, vi, beforeEach } from "vitest"

// #108: efectivo y tarjeta se pagan en recepción. No se pide comprobante; el pago queda
// pendiente hasta que el gimnasio confirme que recibió el dinero. Yape y transferencia
// siguen pidiendo la captura.

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn() },
    membershipPlan: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn(), create: vi.fn() },
    payment: { findFirst: vi.fn(), create: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  }
  return { prisma, auth: vi.fn(), saveFile: vi.fn() }
})

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mocks.auth() }))
vi.mock("@/lib/realtime", () => ({ emitRealtime: vi.fn() }))
vi.mock("@/lib/storage", () => ({
  saveFile: mocks.saveFile,
  newKey: (folder: string, ext: string) => `${folder}/prueba.${ext}`,
  fileUrl: (key: string) => `/uploads/${key}`,
}))

import { POST as createMembershipPayment } from "@/app/api/payments/route"
import { paymentNeedsReceipt } from "@/constants/payment"

const receiptFile = {
  name: "comprobante.png",
  type: "image/png",
  size: 128,
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
}

function paymentRequest(method: string, includeFile: boolean) {
  const values = new Map<string, unknown>([
    ["planId", "plan-1"],
    ["method", method],
  ])
  if (includeFile) values.set("file", receiptFile)

  return {
    headers: new Headers(),
    formData: async () => ({ get: (key: string) => values.get(key) ?? null }),
  } as unknown as Request
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ user: { email: "laura@gymapp.com" } })
  mocks.prisma.user.findUnique.mockImplementation(
    async (args: { where: { email?: string; id?: string } }) =>
      args.where.email
        ? {
            id: "client-1",
            email: "laura@gymapp.com",
            name: "Laura",
            gymId: "gym-1",
            assignedTrainerId: "trainer-1",
          }
        : { id: "trainer-1", gymId: "gym-1" }
  )
  mocks.prisma.membershipPlan.findUnique.mockResolvedValue({
    id: "plan-1",
    price: 120,
    currency: "PEN",
    durationDays: 30,
    active: true,
    gymId: "gym-1",
  })
  mocks.prisma.membership.findFirst.mockResolvedValue(null)
  mocks.prisma.membership.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({ id: "membership-1", ...data })
  )
  mocks.prisma.payment.findFirst.mockResolvedValue(null)
  mocks.prisma.payment.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({ id: "payment-1", ...data })
  )
  mocks.prisma.notification.create.mockResolvedValue({})
  mocks.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(mocks.prisma)
  )
})

describe("qué métodos piden comprobante", () => {
  it("efectivo y tarjeta no; Yape y transferencia sí", () => {
    expect(paymentNeedsReceipt("CASH")).toBe(false)
    expect(paymentNeedsReceipt("CARD")).toBe(false)
    expect(paymentNeedsReceipt("YAPE")).toBe(true)
    expect(paymentNeedsReceipt("TRANSFER")).toBe(true)
  })
})

describe("POST /api/payments — membresía nueva", () => {
  it.each(["CASH", "CARD"])(
    "%s sin comprobante: crea la membresía sin confirmar y el pago PENDING sin captura",
    async (method) => {
      const response = await createMembershipPayment(paymentRequest(method, false))
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.payment.status).toBe("PENDING")
      expect(body.payment.receiptUrl).toBeNull()
      expect(body.payment.method).toBe(method)
      expect(body.membership.paymentConfirmed).toBe(false)
      expect(mocks.saveFile).not.toHaveBeenCalled()

      const notification = mocks.prisma.notification.create.mock.calls[0][0].data
      expect(notification.userId).toBe("trainer-1")
      expect(notification.title).toBe("Pago por confirmar")
      expect(notification.message).toContain("en recepción")
    }
  )

  it.each(["YAPE", "TRANSFER"])("%s sin comprobante se rechaza", async (method) => {
    const response = await createMembershipPayment(paymentRequest(method, false))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("Comprobante requerido")
    expect(mocks.prisma.membership.create).not.toHaveBeenCalled()
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled()
  })

  it("Yape con comprobante guarda la captura y avisa del comprobante", async () => {
    const response = await createMembershipPayment(paymentRequest("YAPE", true))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.payment.receiptUrl).toBe("/uploads/receipts/prueba.png")
    expect(mocks.saveFile).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.notification.create.mock.calls[0][0].data.title).toBe(
      "Nuevo comprobante de pago"
    )
  })
})

describe("pantallas de pago", () => {
  const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), "utf8")

  it("los dos formularios del miembro deciden con la misma regla si piden comprobante", () => {
    for (const ruta of [
      "src/components/memberships/payment-form.tsx",
      "src/app/membresia/membresia-content.tsx",
    ]) {
      const fuente = leer(ruta)
      expect(fuente).toContain("paymentNeedsReceipt(method)")
      expect(fuente).toContain("Pagaré en recepción")
    }
  })

  it("el miembro ve «Pendiente de confirmar en recepción» cuando el pago no tiene captura", () => {
    const fuente = leer("src/app/membresia/membresia-content.tsx")
    expect(fuente).toContain("pendingPayment && !pendingPayment.receiptUrl")
    expect(fuente).toContain("Pendiente de confirmar en recepción")
  })

  it("la bandeja del gimnasio explica los pagos sin captura y deja confirmarlos", () => {
    const bandeja = leer("src/app/coach/payments/page.tsx")
    expect(bandeja).toContain("Pago en recepción: confírmalo cuando recibas el dinero")
    const panel = leer("src/components/admin/membership-panel.tsx")
    expect(panel).toContain("Confirmar pago en recepción")
    expect(panel).toContain("Pago en recepción por confirmar")
  })
})
