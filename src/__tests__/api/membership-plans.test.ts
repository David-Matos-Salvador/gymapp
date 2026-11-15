import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const gymFindUnique = vi.fn()
  const planFindMany = vi.fn()
  const planFindUnique = vi.fn()
  const planCreate = vi.fn()
  const planUpdate = vi.fn()
  const planDelete = vi.fn()
  const priceHistoryCreate = vi.fn()
  const membershipFindMany = vi.fn()
  const notificationCreateMany = vi.fn()
  const transaction = vi.fn()

  const prisma = {
    user: { findUnique: userFindUnique },
    gym: { findUnique: gymFindUnique },
    membershipPlan: {
      findMany: planFindMany,
      findUnique: planFindUnique,
      create: planCreate,
      update: planUpdate,
      delete: planDelete,
    },
    membershipPlanPriceHistory: { create: priceHistoryCreate },
    membership: { findMany: membershipFindMany },
    notification: { createMany: notificationCreateMany },
    $transaction: transaction,
  }

  return {
    userFindUnique,
    gymFindUnique,
    planFindMany,
    planFindUnique,
    planCreate,
    planUpdate,
    planDelete,
    priceHistoryCreate,
    membershipFindMany,
    notificationCreateMany,
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

import { GET as listPlans, POST as createPlan } from "@/app/api/membership-plans/route"
import { PATCH as updatePlan, DELETE as deletePlan } from "@/app/api/membership-plans/[id]/route"

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId })
}

function listRequest(gymId?: string) {
  const query = gymId ? `?gymId=${gymId}` : ""
  return new Request(`http://localhost:3000/api/membership-plans${query}`)
}

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost:3000/api/membership-plans", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function routeParams(id = "p-1") {
  return { params: Promise.resolve({ id }) }
}

const newPlan = { gymId: "gym-1", name: "Mensual", price: 120, durationDays: 30 }

const existingPlan = {
  id: "p-1",
  gymId: "gym-1",
  name: "Mensual",
  price: 120,
  currency: "PEN",
  durationDays: 30,
  active: true,
}

function duplicateNameError() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userFindUnique.mockReset()
  mocks.gymFindUnique.mockReset()
  mocks.planFindMany.mockReset()
  mocks.planFindUnique.mockReset()
  mocks.planCreate.mockReset()
  mocks.planUpdate.mockReset()
  mocks.planDelete.mockReset()
  mocks.priceHistoryCreate.mockReset()
  mocks.membershipFindMany.mockReset()
  mocks.notificationCreateMany.mockReset()
  mocks.transaction.mockReset()

  mocks.transaction.mockImplementation(async (fn: (tx: typeof mocks.prisma) => unknown) =>
    fn(mocks.prisma)
  )
  mocks.gymFindUnique.mockResolvedValue({ id: "gym-1", isDefault: false })
  mocks.planFindMany.mockResolvedValue([])
  mocks.planCreate.mockImplementation(async (args: { data: object }) => ({
    id: "p-nuevo",
    ...args.data,
  }))
  mocks.planUpdate.mockImplementation(async (args: { data: object }) => ({
    ...existingPlan,
    ...args.data,
  }))
  mocks.planDelete.mockResolvedValue(existingPlan)
  mocks.priceHistoryCreate.mockResolvedValue({})
  mocks.membershipFindMany.mockResolvedValue([])
  mocks.notificationCreateMany.mockResolvedValue({ count: 0 })
})

describe("GET /api/membership-plans", () => {
  it("responde 400 sin sesión y sin gymId", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listPlans(listRequest())

    expect(response.status).toBe(400)
    expect(mocks.planFindMany).not.toHaveBeenCalled()
  })

  it("sin sesión lista solo los planes activos del gimnasio pedido", async () => {
    mockAuth.mockResolvedValue(null)
    mocks.planFindMany.mockResolvedValue([existingPlan])

    const response = await listPlans(listRequest("gym-2"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.plans).toEqual([existingPlan])
    expect(mocks.planFindMany).toHaveBeenCalledWith({
      where: { active: true, gymId: "gym-2" },
      orderBy: { price: "asc" },
    })
  })

  it.each(["MEMBER", "TRAINER", "ADMIN"])(
    "un %s recibe los planes de su gimnasio aunque pida los de otro",
    async (role) => {
      loginAs(role, "gym-1")

      await listPlans(listRequest("gym-2"))

      expect(mocks.planFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, gymId: "gym-1" } })
      )
    }
  )

  it("un miembro sin gimnasio no ve planes de ningún gimnasio", async () => {
    loginAs("MEMBER", null)

    await listPlans(listRequest("gym-2"))

    expect(mocks.planFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true, gymId: "__no_gym__" } })
    )
  })

  it("el súper admin puede ver los planes del gimnasio que pida", async () => {
    loginAs("SUPER_ADMIN", null)

    await listPlans(listRequest("gym-2"))

    expect(mocks.planFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true, gymId: "gym-2" } })
    )
  })
})

describe("POST /api/membership-plans", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await createPlan(jsonRequest("POST", newPlan))

    expect(response.status).toBe(401)
    expect(mocks.planCreate).not.toHaveBeenCalled()
  })

  it.each(["MEMBER", "TRAINER"])("responde 403 a un %s", async (role) => {
    loginAs(role)

    const response = await createPlan(jsonRequest("POST", newPlan))

    expect(response.status).toBe(403)
    expect(mocks.planCreate).not.toHaveBeenCalled()
  })

  it.each([
    ["precio negativo", { price: -1 }],
    ["precio con tres decimales", { price: 10.999 }],
    ["duración de 0 días", { durationDays: 0 }],
    ["duración con decimales", { durationDays: 1.5 }],
    ["moneda distinta de PEN", { currency: "USD" }],
    ["nombre vacío", { name: "   " }],
  ])("responde 400 con %s", async (_caso, cambio) => {
    loginAs("ADMIN")

    const response = await createPlan(jsonRequest("POST", { ...newPlan, ...cambio }))

    expect(response.status).toBe(400)
    expect(mocks.planCreate).not.toHaveBeenCalled()
  })

  it("no deja a un admin crear planes en otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")

    const response = await createPlan(jsonRequest("POST", { ...newPlan, gymId: "gym-2" }))

    expect(response.status).toBe(403)
    expect(mocks.planCreate).not.toHaveBeenCalled()
  })

  it("responde 403 a un admin sin gimnasio", async () => {
    loginAs("ADMIN", null)

    const response = await createPlan(jsonRequest("POST", newPlan))

    expect(response.status).toBe(403)
    expect(mocks.planCreate).not.toHaveBeenCalled()
  })

  it("responde 404 si el gimnasio no existe", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.gymFindUnique.mockResolvedValue(null)

    const response = await createPlan(jsonRequest("POST", { ...newPlan, gymId: "gym-nada" }))

    expect(response.status).toBe(404)
    expect(mocks.planCreate).not.toHaveBeenCalled()
  })

  it("responde 409 en el gimnasio por defecto", async () => {
    loginAs("ADMIN")
    mocks.gymFindUnique.mockResolvedValue({ id: "gym-1", isDefault: true })

    const response = await createPlan(jsonRequest("POST", newPlan))

    expect(response.status).toBe(409)
    expect(mocks.planCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si ya hay un plan con ese nombre", async () => {
    loginAs("ADMIN")
    mocks.planCreate.mockRejectedValue(duplicateNameError())

    const response = await createPlan(jsonRequest("POST", newPlan))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toMatch(/Ya existe un plan/)
  })

  it("el admin crea un plan en su gimnasio, en soles por defecto", async () => {
    loginAs("ADMIN", "gym-1")

    const response = await createPlan(jsonRequest("POST", newPlan))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.plan.id).toBe("p-nuevo")
    expect(mocks.planCreate).toHaveBeenCalledWith({
      data: {
        gymId: "gym-1",
        name: "Mensual",
        description: undefined,
        price: 120,
        currency: "PEN",
        durationDays: 30,
      },
    })
  })

  it("el súper admin crea el plan en el gimnasio que indique", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.gymFindUnique.mockResolvedValue({ id: "gym-2", isDefault: false })

    const response = await createPlan(jsonRequest("POST", { ...newPlan, gymId: "gym-2" }))

    expect(response.status).toBe(201)
    expect(mocks.planCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ gymId: "gym-2" }),
    })
  })
})

describe("PATCH /api/membership-plans/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updatePlan(jsonRequest("PATCH", { price: 150 }), routeParams())

    expect(response.status).toBe(401)
    expect(mocks.planUpdate).not.toHaveBeenCalled()
  })

  it.each(["MEMBER", "TRAINER"])("responde 403 a un %s", async (role) => {
    loginAs(role)

    const response = await updatePlan(jsonRequest("PATCH", { price: 150 }), routeParams())

    expect(response.status).toBe(403)
    expect(mocks.planUpdate).not.toHaveBeenCalled()
  })

  it("responde 400 con un precio inválido", async () => {
    loginAs("ADMIN")

    const response = await updatePlan(jsonRequest("PATCH", { price: -5 }), routeParams())

    expect(response.status).toBe(400)
    expect(mocks.planUpdate).not.toHaveBeenCalled()
  })

  it("responde 404 si el plan no existe", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue(null)

    const response = await updatePlan(jsonRequest("PATCH", { price: 150 }), routeParams("p-nada"))

    expect(response.status).toBe(404)
    expect(mocks.planUpdate).not.toHaveBeenCalled()
  })

  it("no deja a un admin editar el plan de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.planFindUnique.mockResolvedValue({ ...existingPlan, gymId: "gym-2" })

    const response = await updatePlan(jsonRequest("PATCH", { price: 150 }), routeParams())

    expect(response.status).toBe(403)
    expect(mocks.planUpdate).not.toHaveBeenCalled()
  })

  it("al cambiar el precio guarda el historial y avisa a quienes tienen el plan vigente", async () => {
    loginAs("ADMIN", "gym-1", "u-admin")
    mocks.planFindUnique.mockResolvedValue(existingPlan)
    mocks.membershipFindMany.mockResolvedValue([{ userId: "u-carlos" }, { userId: "u-ana" }])

    const response = await updatePlan(jsonRequest("PATCH", { price: 150 }), routeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.plan.price).toBe(150)
    expect(mocks.priceHistoryCreate).toHaveBeenCalledWith({
      data: {
        planId: "p-1",
        oldPrice: 120,
        newPrice: 150,
        oldCurrency: "PEN",
        newCurrency: "PEN",
        changedById: "u-admin",
      },
    })
    const aviso = mocks.notificationCreateMany.mock.calls[0][0] as {
      data: { userId: string; type: string }[]
    }
    expect(aviso.data.map((n) => n.userId)).toEqual(["u-carlos", "u-ana"])
    expect(aviso.data.every((n) => n.type === "MEMBERSHIP")).toBe(true)
  })

  it("si el precio no cambia no guarda historial ni avisa", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue(existingPlan)

    const response = await updatePlan(
      jsonRequest("PATCH", { name: "Mensual plus", price: 120 }),
      routeParams()
    )

    expect(response.status).toBe(200)
    expect(mocks.planUpdate).toHaveBeenCalledWith({
      where: { id: "p-1" },
      data: { name: "Mensual plus", price: 120 },
    })
    expect(mocks.priceHistoryCreate).not.toHaveBeenCalled()
    expect(mocks.notificationCreateMany).not.toHaveBeenCalled()
  })

  it("responde 409 si el nombre nuevo ya existe en el gimnasio", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue(existingPlan)
    mocks.planUpdate.mockRejectedValue(duplicateNameError())

    const response = await updatePlan(jsonRequest("PATCH", { name: "Anual" }), routeParams())

    expect(response.status).toBe(409)
  })

  it("el súper admin puede editar el plan de cualquier gimnasio", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.planFindUnique.mockResolvedValue({ ...existingPlan, gymId: "gym-2" })

    const response = await updatePlan(jsonRequest("PATCH", { active: false }), routeParams())

    expect(response.status).toBe(200)
    expect(mocks.planUpdate).toHaveBeenCalledWith({ where: { id: "p-1" }, data: { active: false } })
  })
})

describe("DELETE /api/membership-plans/[id]", () => {
  function deleteRequest() {
    return new Request("http://localhost:3000/api/membership-plans/p-1", { method: "DELETE" })
  }

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deletePlan(deleteRequest(), routeParams())

    expect(response.status).toBe(401)
    expect(mocks.planDelete).not.toHaveBeenCalled()
  })

  it.each(["MEMBER", "TRAINER"])("responde 403 a un %s", async (role) => {
    loginAs(role)

    const response = await deletePlan(deleteRequest(), routeParams())

    expect(response.status).toBe(403)
    expect(mocks.planDelete).not.toHaveBeenCalled()
  })

  it("responde 404 si el plan no existe", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue(null)

    const response = await deletePlan(deleteRequest(), routeParams("p-nada"))

    expect(response.status).toBe(404)
    expect(mocks.planDelete).not.toHaveBeenCalled()
  })

  it("no deja a un admin borrar el plan de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.planFindUnique.mockResolvedValue({
      id: "p-1",
      gymId: "gym-2",
      _count: { memberships: 0 },
    })

    const response = await deletePlan(deleteRequest(), routeParams())

    expect(response.status).toBe(403)
    expect(mocks.planDelete).not.toHaveBeenCalled()
  })

  it("responde 409 si el plan tiene membresías", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue({
      id: "p-1",
      gymId: "gym-1",
      _count: { memberships: 2 },
    })

    const response = await deletePlan(deleteRequest(), routeParams())

    expect(response.status).toBe(409)
    expect(mocks.planDelete).not.toHaveBeenCalled()
  })

  it("el admin borra un plan sin membresías de su gimnasio", async () => {
    loginAs("ADMIN")
    mocks.planFindUnique.mockResolvedValue({
      id: "p-1",
      gymId: "gym-1",
      _count: { memberships: 0 },
    })

    const response = await deletePlan(deleteRequest(), routeParams())

    expect(response.status).toBe(200)
    expect(mocks.planDelete).toHaveBeenCalledWith({ where: { id: "p-1" } })
  })
})
