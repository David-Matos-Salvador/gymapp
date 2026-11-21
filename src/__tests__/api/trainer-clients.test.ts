import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const sessionUser = vi.fn()
  const otherUser = vi.fn()
  const userFindUnique = vi.fn((args: { where: { email?: string } }) =>
    args.where.email ? sessionUser(args) : otherUser(args)
  )
  const userFindMany = vi.fn()
  const userUpdate = vi.fn()
  const trainerRequestFindFirst = vi.fn()
  const trainerRequestFindUnique = vi.fn()
  const trainerRequestCreate = vi.fn()
  const trainerRequestUpdate = vi.fn()
  const trainerRequestUpdateMany = vi.fn()
  const notificationCreate = vi.fn()
  const transaction = vi.fn()
  const getTrainerClientIds = vi.fn()
  const hasAnyTrainer = vi.fn()
  const emitRealtime = vi.fn()

  return {
    sessionUser,
    otherUser,
    userFindUnique,
    userFindMany,
    userUpdate,
    trainerRequestFindFirst,
    trainerRequestFindUnique,
    trainerRequestCreate,
    trainerRequestUpdate,
    trainerRequestUpdateMany,
    notificationCreate,
    transaction,
    getTrainerClientIds,
    hasAnyTrainer,
    emitRealtime,
    prisma: {
      user: { findUnique: userFindUnique, findMany: userFindMany, update: userUpdate },
      trainerRequest: {
        findFirst: trainerRequestFindFirst,
        findUnique: trainerRequestFindUnique,
        create: trainerRequestCreate,
        update: trainerRequestUpdate,
        updateMany: trainerRequestUpdateMany,
      },
      notification: { create: notificationCreate },
      $transaction: transaction,
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/trainer-client", () => ({
  getTrainerClientIds: (...args: unknown[]) => mocks.getTrainerClientIds(...args),
  hasAnyTrainer: (...args: unknown[]) => mocks.hasAnyTrainer(...args),
}))

vi.mock("@/lib/realtime", () => ({
  emitRealtime: (...args: unknown[]) => mocks.emitRealtime(...args),
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

import { GET as listClients, POST as sendRequest } from "@/app/api/trainer/clients/route"
import { GET as getClient, DELETE as removeClient } from "@/app/api/trainer/clients/[id]/route"

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.sessionUser.mockResolvedValue({ id, role, gymId, name: "Ana Coach" })
}

function postRequest(body: unknown) {
  return new Request("http://localhost:3000/api/trainer/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function idArgs(id = "u-carlos", method = "GET") {
  return [
    new Request(`http://localhost:3000/api/trainer/clients/${id}`, { method }),
    { params: Promise.resolve({ id }) },
  ] as const
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.sessionUser.mockReset()
  mocks.otherUser.mockReset().mockResolvedValue(null)
  mocks.userFindMany.mockReset().mockResolvedValue([])
  mocks.userUpdate.mockReset().mockResolvedValue({})
  mocks.trainerRequestFindFirst.mockReset().mockResolvedValue(null)
  mocks.trainerRequestFindUnique.mockReset().mockResolvedValue(null)
  mocks.trainerRequestCreate
    .mockReset()
    .mockImplementation(async (args: { data: object }) => ({ id: "tr-new", ...args.data }))
  mocks.trainerRequestUpdate
    .mockReset()
    .mockImplementation(async (args: { where: { id: string }; data: object }) => ({
      id: args.where.id,
      ...args.data,
    }))
  mocks.trainerRequestUpdateMany.mockReset().mockResolvedValue({ count: 1 })
  mocks.notificationCreate.mockReset().mockResolvedValue({})
  mocks.transaction.mockReset().mockImplementation(async (ops: unknown[]) => ops)
  mocks.getTrainerClientIds.mockReset().mockResolvedValue([])
  mocks.hasAnyTrainer.mockReset().mockResolvedValue(false)
})

describe("GET /api/trainer/clients", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listClients()

    expect(response.status).toBe(401)
  })

  it.each(["MEMBER", "SUPER_ADMIN"])("responde 403 a un %s", async (role) => {
    loginAs(role)

    const response = await listClients()

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin permisos" })
    expect(mocks.getTrainerClientIds).not.toHaveBeenCalled()
  })

  it("responde 403 a un coach sin gimnasio", async () => {
    loginAs("TRAINER", null)

    const response = await listClients()

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin gimnasio asignado" })
  })

  it("devuelve una lista vacía sin consultar usuarios si el coach no tiene clientes", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")

    const response = await listClients()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ clients: [] })
    expect(mocks.getTrainerClientIds).toHaveBeenCalledWith("u-ana", "gym-1")
    expect(mocks.userFindMany).not.toHaveBeenCalled()
  })

  it("lista solo clientes asignados, del mismo gimnasio y no borrados", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    mocks.getTrainerClientIds.mockResolvedValue(["u-carlos", "u-lucia"])
    mocks.userFindMany.mockResolvedValue([{ id: "u-carlos" }, { id: "u-lucia" }])

    const response = await listClients()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ clients: [{ id: "u-carlos" }, { id: "u-lucia" }] })
    expect(mocks.userFindMany.mock.calls[0][0].where).toEqual({
      id: { in: ["u-carlos", "u-lucia"] },
      gymId: "gym-1",
      deletedAt: null,
    })
  })
})

describe("POST /api/trainer/clients", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(401)
  })

  it("responde 403 a un miembro", async () => {
    loginAs("MEMBER")

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(403)
    expect(mocks.trainerRequestCreate).not.toHaveBeenCalled()
  })

  it("responde 403 a un coach sin gimnasio", async () => {
    loginAs("TRAINER", null)

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin gimnasio asignado" })
  })

  it.each([
    ["sin clientId", {}],
    ["con clientId vacío", { clientId: "" }],
  ])("responde 400 %s", async (_caso, body) => {
    loginAs("TRAINER")

    const response = await sendRequest(postRequest(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Datos inválidos" })
  })

  it("responde 400 si el cuerpo no es JSON", async () => {
    loginAs("TRAINER")

    const response = await sendRequest(
      new Request("http://localhost:3000/api/trainer/clients", { method: "POST", body: "{" })
    )

    expect(response.status).toBe(400)
  })

  it.each([
    ["no existe", null],
    ["no es miembro", { id: "u-carlos", role: "TRAINER", gymId: "gym-1" }],
    ["es de otro gimnasio", { id: "u-carlos", role: "MEMBER", gymId: "gym-2" }],
  ])("responde 404 si el usuario %s", async (_caso, client) => {
    loginAs("TRAINER", "gym-1")
    mocks.otherUser.mockResolvedValue(client)

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Usuario no encontrado" })
    expect(mocks.trainerRequestCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si el miembro ya tiene entrenador", async () => {
    loginAs("TRAINER", "gym-1")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", role: "MEMBER", gymId: "gym-1" })
    mocks.hasAnyTrainer.mockResolvedValue(true)

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "El usuario ya tiene un entrenador asignado" })
  })

  it("responde 409 si ya hay una solicitud pendiente", async () => {
    loginAs("TRAINER", "gym-1")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", role: "MEMBER", gymId: "gym-1" })
    mocks.trainerRequestFindFirst.mockResolvedValue({ id: "tr-1", status: "PENDING" })

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: "Ya existe una solicitud pendiente para este usuario",
    })
  })

  it("responde 409 si ya hubo una solicitud aceptada", async () => {
    loginAs("TRAINER", "gym-1")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", role: "MEMBER", gymId: "gym-1" })
    mocks.trainerRequestFindUnique.mockResolvedValue({ id: "tr-1", status: "ACCEPTED" })

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "Ya existe una solicitud para este usuario" })
  })

  it("crea la solicitud, avisa al miembro y emite el evento en tiempo real", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", role: "MEMBER", gymId: "gym-1" })

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(201)
    expect(mocks.trainerRequestCreate).toHaveBeenCalledWith({
      data: { trainerId: "u-ana", clientId: "u-carlos" },
    })
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u-carlos",
        title: "Solicitud de entrenador",
        message: "Ana Coach quiere ser tu coach. Revisa y acepta la solicitud.",
        type: "TRAINER_REQUEST",
      }),
    })
    expect(mocks.emitRealtime).toHaveBeenCalledWith("notifications", "gym-1")
  })

  it("reabre una solicitud rechazada en vez de crear otra", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", role: "MEMBER", gymId: "gym-1" })
    mocks.trainerRequestFindUnique.mockResolvedValue({ id: "tr-old", status: "REJECTED" })

    const response = await sendRequest(postRequest({ clientId: "u-carlos" }))

    expect(response.status).toBe(201)
    expect(mocks.trainerRequestCreate).not.toHaveBeenCalled()
    expect(mocks.trainerRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tr-old" },
        data: expect.objectContaining({ status: "PENDING", acceptedAt: null, rejectedAt: null }),
      })
    )
  })
})

describe("GET /api/trainer/clients/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getClient(...idArgs())

    expect(response.status).toBe(401)
  })

  it("responde 403 a un miembro", async () => {
    loginAs("MEMBER")

    const response = await getClient(...idArgs())

    expect(response.status).toBe(403)
    expect(mocks.otherUser).not.toHaveBeenCalled()
  })

  it("responde 403 a un coach sin gimnasio", async () => {
    loginAs("TRAINER", null)

    const response = await getClient(...idArgs())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin gimnasio asignado" })
  })

  it("busca el cliente solo entre los asignados al coach en su gimnasio", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")

    const response = await getClient(...idArgs("u-carlos"))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Cliente no encontrado" })
    expect(mocks.otherUser.mock.calls[0][0].where).toEqual({
      id: "u-carlos",
      assignedTrainerId: "u-ana",
      gymId: "gym-1",
    })
  })

  it("no expone la contraseña del cliente", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", name: "Carlos" })

    await getClient(...idArgs("u-carlos"))

    const select = mocks.otherUser.mock.calls[0][0].select
    expect(select).toBeDefined()
    expect(select.password).toBeUndefined()
  })

  it("devuelve la ficha del cliente asignado", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", name: "Carlos" })

    const response = await getClient(...idArgs("u-carlos"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ client: { id: "u-carlos", name: "Carlos" } })
  })

  it.todo(
    "la ficha debería excluir clientes borrados (deletedAt) como hace la lista; hoy el detalle no filtra deletedAt"
  )
})

describe("DELETE /api/trainer/clients/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await removeClient(...idArgs("u-carlos", "DELETE"))

    expect(response.status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 403 a un miembro", async () => {
    loginAs("MEMBER")

    const response = await removeClient(...idArgs("u-carlos", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 404 si el cliente no está asignado a ese coach", async () => {
    loginAs("TRAINER", "gym-1", "u-otro-coach")

    const response = await removeClient(...idArgs("u-carlos", "DELETE"))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Cliente no encontrado" })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("desasigna al cliente, cierra la solicitud aceptada y le avisa", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    mocks.otherUser.mockResolvedValue({ id: "u-carlos", assignedTrainerId: "u-ana" })

    const response = await removeClient(...idArgs("u-carlos", "DELETE"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "u-carlos" },
      data: { assignedTrainerId: null },
    })
    expect(mocks.trainerRequestUpdateMany).toHaveBeenCalledWith({
      where: { clientId: "u-carlos", trainerId: "u-ana", status: "ACCEPTED" },
      data: { status: "REJECTED", rejectedAt: expect.any(Date) },
    })
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u-carlos",
        title: "Entrenador desasignado",
        message: "Ana Coach ya no está asignado como tu coach.",
      }),
    })
  })
})
