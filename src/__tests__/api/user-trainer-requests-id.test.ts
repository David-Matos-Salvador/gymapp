import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const requestFindUnique = vi.fn()
  const requestUpdate = vi.fn()
  const notificationUpdateMany = vi.fn()
  const notificationCreate = vi.fn()
  const membershipFindFirst = vi.fn()
  const tx = {
    user: { updateMany: vi.fn() },
    trainerRequest: { updateMany: vi.fn(), findUnique: vi.fn() },
  }
  const transaction = vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx))

  return {
    userFindUnique,
    requestFindUnique,
    requestUpdate,
    notificationUpdateMany,
    notificationCreate,
    membershipFindFirst,
    tx,
    transaction,
    prisma: {
      user: { findUnique: userFindUnique },
      trainerRequest: { findUnique: requestFindUnique, update: requestUpdate },
      notification: { updateMany: notificationUpdateMany, create: notificationCreate },
      membership: { findFirst: membershipFindFirst },
      $transaction: transaction,
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

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

import { GET as getRequest, PUT as answerRequest } from "@/app/api/user/trainer-requests/[id]/route"

function loginAs(id: string, gymId: string | null = "gym-1", name: string | null = "Lucía") {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role: "MEMBER", gymId, name })
}

function withId(id: string, method: string, body?: unknown) {
  return [
    new Request(`http://localhost:3000/api/user/trainer-requests/${id}`, {
      method,
      ...(body !== undefined
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    }),
    { params: Promise.resolve({ id }) },
  ] as const
}

const trainer = { id: "coach-1", role: "TRAINER", gymId: "gym-1", name: "Coach Ana" }

function pendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "tr-1",
    clientId: "member-1",
    trainerId: "coach-1",
    status: "PENDING",
    trainer,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockReset()
  mocks.userFindUnique.mockReset().mockResolvedValue(null)
  mocks.requestFindUnique.mockReset().mockResolvedValue(null)
  mocks.requestUpdate
    .mockReset()
    .mockImplementation(async (a: { where: { id: string }; data: object }) => ({
      id: a.where.id,
      ...a.data,
    }))
  mocks.notificationUpdateMany.mockReset().mockResolvedValue({ count: 1 })
  mocks.notificationCreate.mockReset().mockResolvedValue({})
  mocks.membershipFindFirst.mockReset().mockResolvedValue(null)
  mocks.tx.user.updateMany.mockReset().mockResolvedValue({ count: 1 })
  mocks.tx.trainerRequest.updateMany.mockReset().mockResolvedValue({ count: 1 })
  mocks.tx.trainerRequest.findUnique
    .mockReset()
    .mockResolvedValue({ id: "tr-1", status: "ACCEPTED" })
})

describe("GET /api/user/trainer-requests/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getRequest(...withId("tr-1", "GET"))

    expect(response.status).toBe(401)
    expect(mocks.requestFindUnique).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await getRequest(...withId("tr-1", "GET"))

    expect(response.status).toBe(404)
  })

  it("responde 404 si la solicitud no existe", async () => {
    loginAs("member-1")

    const response = await getRequest(...withId("tr-x", "GET"))

    expect(response.status).toBe(404)
  })

  it("alguien que no es el cliente ni el coach recibe 403", async () => {
    loginAs("member-2")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())

    const response = await getRequest(...withId("tr-1", "GET"))

    expect(response.status).toBe(403)
  })

  it.each(["member-1", "coach-1"])("%s ve la solicitud con los datos del coach", async (id) => {
    loginAs(id)
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())

    const response = await getRequest(...withId("tr-1", "GET"))

    expect(response.status).toBe(200)
    expect((await response.json()).request).toMatchObject({ id: "tr-1", trainer })
    expect(mocks.requestFindUnique).toHaveBeenCalledWith({
      where: { id: "tr-1" },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            specialties: true,
            yearsExperience: true,
          },
        },
      },
    })
  })
})

describe("PUT /api/user/trainer-requests/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(404)
  })

  it("responde 404 si la solicitud no existe", async () => {
    loginAs("member-1")

    const response = await answerRequest(...withId("tr-x", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(404)
  })

  it("el coach no puede responder su propia solicitud", async () => {
    loginAs("coach-1")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("otro miembro no puede responder la solicitud", async () => {
    loginAs("member-2")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "REJECTED" }))

    expect(response.status).toBe(403)
    expect(mocks.requestUpdate).not.toHaveBeenCalled()
  })

  it("responde 409 si la solicitud ya fue procesada", async () => {
    loginAs("member-1")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest({ status: "ACCEPTED" }))

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "REJECTED" }))

    expect(response.status).toBe(409)
    expect(mocks.requestUpdate).not.toHaveBeenCalled()
  })

  it("al rechazar marca la solicitud y avisa al coach", async () => {
    loginAs("member-1")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "REJECTED" }))

    expect(response.status).toBe(200)
    expect(mocks.requestUpdate).toHaveBeenCalledWith({
      where: { id: "tr-1" },
      data: { status: "REJECTED", rejectedAt: expect.any(Date) },
    })
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "coach-1",
        title: "Solicitud rechazada",
        message: "Lucía rechazó tu solicitud de entrenamiento.",
        metadata: { requestId: "tr-1" },
      }),
    })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("sin nombre, el aviso al coach dice «Un usuario»", async () => {
    loginAs("member-1", "gym-1", null)
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())

    await answerRequest(...withId("tr-1", "PUT", { action: "REJECTED" }))

    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        message: "Un usuario rechazó tu solicitud de entrenamiento.",
      }),
    })
  })

  it("no deja aceptar a un coach de otro gimnasio (responde 404)", async () => {
    loginAs("member-1", "gym-1")
    mocks.requestFindUnique.mockResolvedValue(
      pendingRequest({ trainer: { ...trainer, gymId: "gym-2" } })
    )

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(404)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("no deja aceptar si ni el miembro ni el coach tienen gimnasio", async () => {
    loginAs("member-1", null)
    mocks.requestFindUnique.mockResolvedValue(
      pendingRequest({ trainer: { ...trainer, gymId: null } })
    )

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(404)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("no deja aceptar si quien envió la solicitud ya no es coach ni admin", async () => {
    loginAs("member-1")
    mocks.requestFindUnique.mockResolvedValue(
      pendingRequest({ trainer: { ...trainer, role: "MEMBER" } })
    )

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(404)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 409 si el miembro ya tiene otro coach asignado", async () => {
    loginAs("member-1")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())
    mocks.tx.user.updateMany.mockResolvedValue({ count: 0 })

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(409)
    expect(mocks.tx.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "member-1",
        OR: [{ assignedTrainerId: null }, { assignedTrainerId: "coach-1" }],
      },
      data: { assignedTrainerId: "coach-1" },
    })
    expect(mocks.tx.trainerRequest.updateMany).not.toHaveBeenCalled()
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si otra petición aceptó la solicitud al mismo tiempo", async () => {
    loginAs("member-1")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())
    mocks.tx.trainerRequest.updateMany.mockResolvedValue({ count: 0 })

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(409)
    expect(mocks.tx.trainerRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "tr-1", status: "PENDING" },
      data: { status: "ACCEPTED", acceptedAt: expect.any(Date) },
    })
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("al aceptar asigna el coach, avisa y cuenta si ya tiene membresía activa", async () => {
    loginAs("member-1")
    mocks.requestFindUnique.mockResolvedValue(pendingRequest())
    mocks.membershipFindFirst.mockResolvedValue({ id: "m-1", status: "ACTIVE", plan: {} })

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      request: { id: "tr-1", status: "ACCEPTED" },
      hasActiveMembership: true,
      activeMembership: { id: "m-1", status: "ACTIVE", plan: {} },
    })
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: "member-1", type: "TRAINER_REQUEST", read: false },
      data: { read: true },
    })
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "coach-1",
        title: "Solicitud aceptada",
        metadata: { requestId: "tr-1", clientId: "member-1" },
      }),
    })
  })

  it("un coach que es admin del mismo gimnasio también puede ser aceptado", async () => {
    loginAs("member-1")
    mocks.requestFindUnique.mockResolvedValue(
      pendingRequest({ trainer: { ...trainer, role: "ADMIN" } })
    )

    const response = await answerRequest(...withId("tr-1", "PUT", { action: "ACCEPTED" }))

    expect(response.status).toBe(200)
    expect((await response.json()).hasActiveMembership).toBe(false)
  })

  it.todo(
    "con una acción que no es ACCEPTED ni REJECTED responde 500: usa `updateSchema.parse` (lanza ZodError) en vez de `safeParse` con 400"
  )
  it.todo(
    "con un cuerpo que no es JSON debería responder 400; hoy `request.json()` no está protegido y la ruta lanza un error (500 sin cuerpo JSON)"
  )
  it.todo(
    "con la solicitud de otra persona GET y PUT responden 403 y confirman que el id existe; deberían responder 404"
  )
  it.todo(
    "al aceptar o rechazar marca como leídas todas las notificaciones TRAINER_REQUEST del miembro, también las de otras solicitudes todavía pendientes"
  )
})
