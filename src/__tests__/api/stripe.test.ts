import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  // El cliente de Stripe se crea al importar la ruta: las llaves tienen que existir antes.
  process.env.STRIPE_SECRET_KEY = "sk_test_falsa"
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_falsa"

  const userFindUnique = vi.fn()
  const userUpdate = vi.fn()
  const paymentCreate = vi.fn()
  const paymentFindUnique = vi.fn()
  const paymentUpdate = vi.fn()
  const planFindUnique = vi.fn()
  const membershipCreate = vi.fn()
  const checkoutCreate = vi.fn()
  const customersCreate = vi.fn()
  const constructEvent = vi.fn()
  const stripeConstructor = vi.fn()
  return {
    userFindUnique,
    userUpdate,
    paymentCreate,
    paymentFindUnique,
    paymentUpdate,
    planFindUnique,
    membershipCreate,
    checkoutCreate,
    customersCreate,
    constructEvent,
    stripeConstructor,
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    prisma: {
      user: { findUnique: userFindUnique, update: userUpdate },
      payment: { create: paymentCreate, findUnique: paymentFindUnique, update: paymentUpdate },
      membershipPlan: { findUnique: planFindUnique },
      membership: { create: membershipCreate },
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/logger", () => ({ logger: mocks.logger }))

vi.mock("stripe", () => ({
  default: class StripeFalso {
    checkout = { sessions: { create: mocks.checkoutCreate } }
    customers = { create: mocks.customersCreate }
    webhooks = { constructEvent: mocks.constructEvent }
    constructor(...args: unknown[]) {
      mocks.stripeConstructor(...args)
    }
  },
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { POST as checkout } from "@/app/api/stripe/checkout/route"
import { POST as createCustomer } from "@/app/api/stripe/create-customer/route"
import { POST as webhook } from "@/app/api/stripe/webhook/route"

const member = {
  id: "member-1",
  name: "Ana",
  email: "ana@test.com",
  role: "MEMBER",
  gymId: "gym-1",
  stripeCustomerId: null as string | null,
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/stripe/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function webhookRequest(signature: string | null = "t=1,v1=firma") {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (signature) headers["stripe-signature"] = signature
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body: JSON.stringify({ id: "evt_1" }),
    headers,
  })
}

function checkoutCompleted(overrides: Record<string, unknown> = {}) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        payment_intent: "pi_1",
        metadata: { userId: "member-1", planId: "plan-1" },
        ...overrides,
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { email: "ana@test.com" } })
  mocks.userFindUnique.mockResolvedValue({ ...member })
  mocks.checkoutCreate.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe/cs_1" })
  mocks.paymentCreate.mockResolvedValue({ id: "payment-1" })
  mocks.customersCreate.mockResolvedValue({ id: "cus_1" })
  mocks.userUpdate.mockResolvedValue({ ...member, stripeCustomerId: "cus_1" })
  mocks.paymentFindUnique.mockResolvedValue({ id: "payment-1", status: "PENDING" })
  mocks.paymentUpdate.mockResolvedValue({ id: "payment-1", status: "COMPLETED" })
  mocks.planFindUnique.mockResolvedValue({ id: "plan-1", durationDays: 30, gymId: "gym-1" })
  mocks.membershipCreate.mockResolvedValue({ id: "membership-1" })
  mocks.constructEvent.mockReturnValue(checkoutCompleted())
})

describe("POST /api/stripe/checkout", () => {
  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await checkout(jsonRequest({ planId: "plan-1", price: 100, planName: "Mensual" }))
    expect(res.status).toBe(401)
    expect(mocks.checkoutCreate).not.toHaveBeenCalled()
  })

  it("404 si el usuario de la sesión ya no existe", async () => {
    mocks.userFindUnique.mockResolvedValue(null)
    const res = await checkout(jsonRequest({ planId: "plan-1", price: 100, planName: "Mensual" }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Usuario no encontrado" })
    expect(mocks.checkoutCreate).not.toHaveBeenCalled()
  })

  it("crea la sesión de pago con el correo y los metadatos del usuario", async () => {
    const res = await checkout(jsonRequest({ planId: "plan-1", price: 99.99, planName: "Mensual" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: "https://checkout.stripe/cs_1" })

    const args = mocks.checkoutCreate.mock.calls[0][0]
    expect(args.customer_email).toBe("ana@test.com")
    expect(args.metadata).toEqual({ userId: "member-1", planId: "plan-1" })
    expect(args.line_items[0].price_data.unit_amount).toBe(9999)
    expect(args.line_items[0].price_data.product_data).toEqual({ name: "Mensual" })
    expect(args.success_url).toMatch(/\/membresia\?success=true$/)
    expect(args.cancel_url).toMatch(/\/membresia\?canceled=true$/)
  })

  it("registra el pago como PENDING enlazado a la sesión de Stripe", async () => {
    await checkout(jsonRequest({ planId: "plan-1", price: 100, planName: "Mensual" }))
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "member-1",
        amount: 100,
        status: "PENDING",
        method: "STRIPE",
        stripeSessionId: "cs_test_1",
        type: "MEMBERSHIP",
      }),
    })
  })

  it("500 con mensaje en español si Stripe falla, sin registrar el pago", async () => {
    mocks.checkoutCreate.mockRejectedValue(new Error("stripe caído"))
    const res = await checkout(jsonRequest({ planId: "plan-1", price: 100, planName: "Mensual" }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Error al crear sesión de pago" })
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
    expect(mocks.logger.error).toHaveBeenCalled()
  })

  it.todo(
    "toma el precio y el nombre del plan del cuerpo que manda el navegador: no busca el plan en la base, así que se puede pagar 1 por un plan de 300 (el webhook luego crea la membresía del plan completo)"
  )
  it.todo(
    "no valida el cuerpo (planId, price, planName): sin precio manda NaN a Stripe y termina en 500 en vez de un 400 en español"
  )
  it.todo(
    "cobra en «mxn» (pesos mexicanos) aunque la app es para Perú y el resto de pagos usa soles"
  )
})

describe("POST /api/stripe/create-customer", () => {
  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await createCustomer(jsonRequest({}))
    expect(res.status).toBe(401)
  })

  it("404 si el usuario no existe", async () => {
    mocks.userFindUnique.mockResolvedValue(null)
    const res = await createCustomer(jsonRequest({}))
    expect(res.status).toBe(404)
  })

  it("devuelve el cliente existente sin crear otro en Stripe", async () => {
    mocks.userFindUnique.mockResolvedValue({ ...member, stripeCustomerId: "cus_viejo" })
    const res = await createCustomer(jsonRequest({}))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ customerId: "cus_viejo" })
    expect(mocks.customersCreate).not.toHaveBeenCalled()
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it("crea el cliente en Stripe y lo guarda en el usuario", async () => {
    const res = await createCustomer(jsonRequest({}))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ customerId: "cus_1" })
    expect(mocks.customersCreate).toHaveBeenCalledWith({ email: "ana@test.com", name: "Ana" })
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { stripeCustomerId: "cus_1" },
    })
  })

  it("500 con mensaje en español si Stripe falla", async () => {
    mocks.customersCreate.mockRejectedValue(new Error("stripe caído"))
    const res = await createCustomer(jsonRequest({}))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Error al crear cliente en Stripe" })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })
})

describe("POST /api/stripe/webhook", () => {
  it("400 si falta la firma de Stripe", async () => {
    const res = await webhook(webhookRequest(null))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Falta firma de Stripe" })
    expect(mocks.constructEvent).not.toHaveBeenCalled()
  })

  it("400 si la firma no es válida, sin tocar la base", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("firma inválida")
    })
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Firma inválida" })
    expect(mocks.paymentUpdate).not.toHaveBeenCalled()
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("verifica la firma con el cuerpo crudo y el secreto del webhook", async () => {
    await webhook(webhookRequest("t=1,v1=abc"))
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      JSON.stringify({ id: "evt_1" }),
      "t=1,v1=abc",
      "whsec_falsa"
    )
  })

  it("400 si a la sesión le faltan metadatos", async () => {
    mocks.constructEvent.mockReturnValue(checkoutCompleted({ metadata: { userId: "member-1" } }))
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Metadata incompleta" })
    expect(mocks.paymentFindUnique).not.toHaveBeenCalled()
  })

  it("404 si no hay un pago registrado para esa sesión", async () => {
    mocks.paymentFindUnique.mockResolvedValue(null)
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Pago no encontrado" })
    expect(mocks.paymentUpdate).not.toHaveBeenCalled()
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("400 si el plan ya no existe, sin crear membresía", async () => {
    mocks.planFindUnique.mockResolvedValue(null)
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Plan no encontrado" })
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it("pago completado: marca el pago y crea la membresía activa y confirmada", async () => {
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })

    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { stripeSessionId: "cs_test_1" },
      data: { status: "COMPLETED", stripePaymentIntentId: "pi_1" },
    })

    const data = mocks.membershipCreate.mock.calls[0][0].data
    expect(data).toMatchObject({
      userId: "member-1",
      planId: "plan-1",
      status: "ACTIVE",
      paymentConfirmed: true,
      paymentMethod: "STRIPE",
      paymentRef: "cs_test_1",
    })
    const days = (data.endDate.getTime() - data.startDate.getTime()) / 86400000
    expect(Math.round(days)).toBe(30)
  })

  it("acepta payment_intent como objeto y guarda su id", async () => {
    mocks.constructEvent.mockReturnValue(checkoutCompleted({ payment_intent: { id: "pi_obj" } }))
    await webhook(webhookRequest())
    expect(mocks.paymentUpdate.mock.calls[0][0].data.stripePaymentIntentId).toBe("pi_obj")
  })

  it("payment_intent.payment_failed: responde recibido sin tocar pagos ni membresías", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_falla" } },
    })
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(200)
    expect(mocks.paymentUpdate).not.toHaveBeenCalled()
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
    expect(mocks.logger.warn).toHaveBeenCalled()
  })

  it("evento desconocido: responde recibido sin tocar la base", async () => {
    mocks.constructEvent.mockReturnValue({ type: "customer.created", data: { object: {} } })
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(200)
    expect(mocks.paymentFindUnique).not.toHaveBeenCalled()
  })

  it("500 si la base falla al procesar el evento", async () => {
    mocks.paymentUpdate.mockRejectedValue(new Error("db caída"))
    const res = await webhook(webhookRequest())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Error interno al procesar webhook" })
  })

  it.todo(
    "no es idempotente: Stripe reintenta eventos y la ruta no mira si el pago ya estaba COMPLETED, así que el mismo evento repetido crea otra membresía"
  )
  it.todo(
    "no compara el userId de los metadatos con el dueño del pago (payment.userId) antes de crear la membresía"
  )
  it.todo(
    "marca el pago como COMPLETED antes de comprobar que el plan exista: si el plan se borró, el pago queda cobrado y sin membresía, y responde 400 (Stripe reintenta sin éxito)"
  )
  it.todo(
    "la membresía nueva no tiene en cuenta una membresía activa previa: empieza hoy en vez de extender la vigente"
  )
})

describe("Stripe sin configurar", () => {
  it("las tres rutas responden 500 en español sin llamar a Stripe ni a la sesión", async () => {
    const secret = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    vi.resetModules()
    try {
      const routes = await Promise.all([
        import("@/app/api/stripe/checkout/route"),
        import("@/app/api/stripe/create-customer/route"),
        import("@/app/api/stripe/webhook/route"),
      ])
      const [c, cc, w] = await Promise.all([
        routes[0].POST(jsonRequest({ planId: "plan-1", price: 1, planName: "x" })),
        routes[1].POST(jsonRequest({})),
        routes[2].POST(webhookRequest()),
      ])
      expect(c.status).toBe(500)
      expect(await c.json()).toEqual({
        error: "Stripe no está configurado. Agrega STRIPE_SECRET_KEY al .env",
      })
      expect(cc.status).toBe(500)
      expect(w.status).toBe(500)
      expect(await w.json()).toEqual({ error: "Configuración de Stripe incompleta" })
      expect(mockAuth).not.toHaveBeenCalled()
      expect(mocks.constructEvent).not.toHaveBeenCalled()
    } finally {
      process.env.STRIPE_SECRET_KEY = secret
    }
  })
})
