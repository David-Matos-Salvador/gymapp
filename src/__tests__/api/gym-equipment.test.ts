import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const gymFindUnique = vi.fn()
  const gymUpdate = vi.fn()
  const equipmentFindMany = vi.fn()
  const equipmentFindUnique = vi.fn()
  const equipmentCreate = vi.fn()
  const equipmentUpdate = vi.fn()
  const equipmentDelete = vi.fn()
  const activationUpsert = vi.fn()

  return {
    userFindUnique,
    gymFindUnique,
    gymUpdate,
    equipmentFindMany,
    equipmentFindUnique,
    equipmentCreate,
    equipmentUpdate,
    equipmentDelete,
    activationUpsert,
    prisma: {
      user: { findUnique: userFindUnique },
      gym: { findUnique: gymFindUnique, update: gymUpdate },
      gymEquipment: {
        findMany: equipmentFindMany,
        findUnique: equipmentFindUnique,
        create: equipmentCreate,
        update: equipmentUpdate,
        delete: equipmentDelete,
      },
      gymEquipmentActivation: { upsert: activationUpsert },
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

import { GET as listEquipment, POST as createEquipment } from "@/app/api/gym-equipment/route"
import {
  PATCH as updateEquipment,
  DELETE as deleteEquipment,
} from "@/app/api/gym-equipment/[id]/route"
import { PATCH as setActivation } from "@/app/api/gym-equipment-activations/route"

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId })
}

/** Gimnasios que existen en la base simulada. */
function withGyms(...ids: string[]) {
  mocks.gymFindUnique.mockImplementation(async (args: { where: { id: string } }) =>
    ids.includes(args.where.id) ? { id: args.where.id, ownerId: `owner-${args.where.id}` } : null
  )
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost:3000${url}`, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  })
}

function withId(url: string, id: string, method: string, body?: unknown) {
  return [jsonRequest(`${url}/${id}`, method, body), { params: Promise.resolve({ id }) }] as const
}

const validEquipment = { name: "Prensa de piernas", category: "Piernas", gymId: "gym-1" }

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockReset()
  mocks.userFindUnique.mockReset().mockResolvedValue(null)
  mocks.gymFindUnique.mockReset().mockResolvedValue(null)
  mocks.gymUpdate.mockReset().mockResolvedValue({})
  mocks.equipmentFindMany.mockReset().mockResolvedValue([])
  mocks.equipmentFindUnique.mockReset().mockResolvedValue(null)
  mocks.equipmentCreate.mockReset().mockImplementation(async (a: { data: object }) => ({
    id: "eq-new",
    ...a.data,
    exercise: null,
  }))
  mocks.equipmentUpdate
    .mockReset()
    .mockImplementation(async (a: { where: { id: string }; data: object }) => ({
      id: a.where.id,
      ...a.data,
      exercise: null,
    }))
  mocks.equipmentDelete.mockReset().mockResolvedValue({})
  mocks.activationUpsert
    .mockReset()
    .mockImplementation(async (a: { create: object; update: object }) => ({
      active: true,
      machineNumber: null,
      imageUrl: null,
      ...a.create,
      ...a.update,
    }))
})

describe("GET /api/gym-equipment", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await listEquipment(jsonRequest("/api/gym-equipment", "GET"))

    expect(response.status).toBe(401)
    expect(mocks.equipmentFindMany).not.toHaveBeenCalled()
  })

  it("un miembro ve el equipo del sistema y el de su gimnasio, por nombre y con límite", async () => {
    loginAs("MEMBER", "gym-1")
    mocks.equipmentFindMany.mockResolvedValue([{ id: "eq-1", name: "Banco" }])

    const response = await listEquipment(jsonRequest("/api/gym-equipment", "GET"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ equipment: [{ id: "eq-1", name: "Banco" }] })
    expect(mocks.equipmentFindMany).toHaveBeenCalledWith({
      where: { OR: [{ isSystem: true }, { gymId: "gym-1" }] },
      include: { exercise: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      take: 1000,
    })
  })

  it("un admin no puede pedir el equipo de otro gimnasio con gymId", async () => {
    loginAs("ADMIN", "gym-1")

    await listEquipment(jsonRequest("/api/gym-equipment?gymId=gym-2", "GET"))

    expect(mocks.equipmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ isSystem: true }, { gymId: "gym-1" }] } })
    )
  })

  it("sin gimnasio solo ve el equipo del sistema", async () => {
    loginAs("MEMBER", null)

    await listEquipment(jsonRequest("/api/gym-equipment", "GET"))

    expect(mocks.equipmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { OR: [{ isSystem: true }] } })
    )
  })

  it("el súper admin puede filtrar por gimnasio o ver todo", async () => {
    loginAs("SUPER_ADMIN", null)

    await listEquipment(jsonRequest("/api/gym-equipment?gymId=gym-2", "GET"))
    expect(mocks.equipmentFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { OR: [{ isSystem: true }, { gymId: "gym-2" }] } })
    )

    await listEquipment(jsonRequest("/api/gym-equipment", "GET"))
    expect(mocks.equipmentFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: undefined })
    )
  })
})

describe("POST /api/gym-equipment", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", validEquipment)
    )

    expect(response.status).toBe(401)
    expect(mocks.equipmentCreate).not.toHaveBeenCalled()
  })

  it("responde 403 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", validEquipment)
    )

    expect(response.status).toBe(403)
  })

  it.each(["MEMBER", "TRAINER"])("un %s no puede crear equipamiento", async (role) => {
    loginAs(role)
    withGyms("gym-1")

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", validEquipment)
    )

    expect(response.status).toBe(403)
    expect(mocks.equipmentCreate).not.toHaveBeenCalled()
  })

  it("responde 400 sin nombre ni gimnasio", async () => {
    loginAs("ADMIN")

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", { name: "", gymId: "" })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toHaveProperty("name")
    expect(data.details).toHaveProperty("gymId")
  })

  it("responde 400 con una imagen que no es una URL válida", async () => {
    loginAs("ADMIN")

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", {
        ...validEquipment,
        imageUrl: "javascript:alert(1)",
      })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).details).toHaveProperty("imageUrl")
  })

  it.each([0, 10000, 1.5])("responde 400 con número de máquina %s", async (machineNumber) => {
    loginAs("ADMIN")

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", { ...validEquipment, machineNumber })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).details).toHaveProperty("machineNumber")
  })

  it("un admin sin gimnasio no puede crear equipamiento", async () => {
    loginAs("ADMIN", null)

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", validEquipment)
    )

    expect(response.status).toBe(403)
    expect(mocks.equipmentCreate).not.toHaveBeenCalled()
  })

  it("un admin crea el equipo en su gimnasio aunque mande el gymId de otro", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1", "gym-2")

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", { ...validEquipment, gymId: "gym-2" })
    )

    expect(response.status).toBe(201)
    expect(mocks.equipmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gymId: "gym-1" }) })
    )
  })

  it("un admin crea equipamiento con número de máquina e imagen subida", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", {
        ...validEquipment,
        machineNumber: 12,
        imageUrl: "/api/files/equipos/prensa.jpg",
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.equipmentCreate).toHaveBeenCalledWith({
      data: {
        ...validEquipment,
        machineNumber: 12,
        imageUrl: "/api/files/equipos/prensa.jpg",
        gymId: "gym-1",
      },
      include: { exercise: { select: { id: true, name: true } } },
    })
    expect((await response.json()).equipment).toMatchObject({
      id: "eq-new",
      name: "Prensa de piernas",
    })
  })

  it("el súper admin crea equipamiento en el gimnasio que indique", async () => {
    loginAs("SUPER_ADMIN", null)
    withGyms("gym-2")

    const response = await createEquipment(
      jsonRequest("/api/gym-equipment", "POST", { ...validEquipment, gymId: "gym-2" })
    )

    expect(response.status).toBe(201)
    expect(mocks.equipmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gymId: "gym-2" }) })
    )
  })

  it.todo(
    "con un cuerpo que no es JSON debería responder 400; hoy `request.json()` no está protegido y la ruta lanza un error (500 sin cuerpo JSON)"
  )
  it.todo(
    "no comprueba que el exerciseId exista ni que el gimnasio del súper admin exista: Prisma falla por la clave foránea y la ruta responde 500"
  )
})

describe("PATCH /api/gym-equipment/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { name: "Banco" })
    )

    expect(response.status).toBe(401)
    expect(mocks.equipmentUpdate).not.toHaveBeenCalled()
  })

  it("responde 403 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { name: "Banco" })
    )

    expect(response.status).toBe(403)
  })

  it("responde 404 si el equipo no existe", async () => {
    loginAs("ADMIN")

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-x", "PATCH", { name: "Banco" })
    )

    expect(response.status).toBe(404)
    expect(mocks.equipmentUpdate).not.toHaveBeenCalled()
  })

  it("un admin no puede editar el equipamiento del sistema", async () => {
    loginAs("ADMIN")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: null })

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { name: "Banco" })
    )

    expect(response.status).toBe(403)
    expect(mocks.equipmentUpdate).not.toHaveBeenCalled()
  })

  it("un admin no puede editar el equipamiento de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1", "gym-2")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: "gym-2" })

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { name: "Banco" })
    )

    expect(response.status).toBe(403)
    expect(mocks.equipmentUpdate).not.toHaveBeenCalled()
  })

  it("un coach no puede editar el equipamiento de su gimnasio", async () => {
    loginAs("TRAINER", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: "gym-1" })

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { name: "Banco" })
    )

    expect(response.status).toBe(403)
  })

  it("responde 400 con datos inválidos", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: "gym-1" })

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { name: "", machineNumber: -3 })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toHaveProperty("name")
    expect(data.details).toHaveProperty("machineNumber")
    expect(mocks.equipmentUpdate).not.toHaveBeenCalled()
  })

  it("un admin edita el equipo de su gimnasio y puede quitarle la imagen", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: "gym-1" })

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { name: "Banco plano", imageUrl: null })
    )

    expect(response.status).toBe(200)
    expect(mocks.equipmentUpdate).toHaveBeenCalledWith({
      where: { id: "eq-1" },
      data: { name: "Banco plano", imageUrl: null },
      include: { exercise: { select: { id: true, name: true } } },
    })
  })

  it("el súper admin edita el equipamiento del sistema", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: null })

    const response = await updateEquipment(
      ...withId("/api/gym-equipment", "eq-1", "PATCH", { location: "Zona libre" })
    )

    expect(response.status).toBe(200)
    expect(mocks.equipmentUpdate).toHaveBeenCalledTimes(1)
  })

  it.todo(
    "con el equipo de otro gimnasio responde 403 y confirma que el id existe; debería responder 404 como el resto de rutas entre gimnasios"
  )
  it.todo(
    "con un exerciseId que no existe Prisma falla por la clave foránea y la ruta responde 500"
  )
})

describe("DELETE /api/gym-equipment/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteEquipment(...withId("/api/gym-equipment", "eq-1", "DELETE"))

    expect(response.status).toBe(401)
    expect(mocks.equipmentDelete).not.toHaveBeenCalled()
  })

  it("responde 404 si el equipo no existe", async () => {
    loginAs("ADMIN")

    const response = await deleteEquipment(...withId("/api/gym-equipment", "eq-x", "DELETE"))

    expect(response.status).toBe(404)
  })

  it("un admin no puede borrar el equipamiento del sistema", async () => {
    loginAs("ADMIN")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: null })

    const response = await deleteEquipment(...withId("/api/gym-equipment", "eq-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.equipmentDelete).not.toHaveBeenCalled()
  })

  it("un admin no puede borrar el equipamiento de otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1", "gym-2")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: "gym-2" })

    const response = await deleteEquipment(...withId("/api/gym-equipment", "eq-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.equipmentDelete).not.toHaveBeenCalled()
  })

  it("un miembro no puede borrar equipamiento", async () => {
    loginAs("MEMBER", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: "gym-1" })

    const response = await deleteEquipment(...withId("/api/gym-equipment", "eq-1", "DELETE"))

    expect(response.status).toBe(403)
  })

  it("un admin borra el equipo de su gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: "gym-1" })

    const response = await deleteEquipment(...withId("/api/gym-equipment", "eq-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mocks.equipmentDelete).toHaveBeenCalledWith({ where: { id: "eq-1" } })
  })

  it("el súper admin borra el equipamiento del sistema", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", gymId: null })

    const response = await deleteEquipment(...withId("/api/gym-equipment", "eq-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(mocks.equipmentDelete).toHaveBeenCalledWith({ where: { id: "eq-1" } })
  })
})

describe("PATCH /api/gym-equipment-activations", () => {
  const url = "/api/gym-equipment-activations"

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-1" }))

    expect(response.status).toBe(401)
    expect(mocks.activationUpsert).not.toHaveBeenCalled()
  })

  it("responde 403 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-1" }))

    expect(response.status).toBe(403)
  })

  it("responde 400 sin equipmentId o con un número de máquina fuera de rango", async () => {
    loginAs("ADMIN")

    const response = await setActivation(
      jsonRequest(url, "PATCH", { equipmentId: "", machineNumber: 0 })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toHaveProperty("equipmentId")
    expect(data.details).toHaveProperty("machineNumber")
  })

  it("un admin sin gimnasio recibe 403", async () => {
    loginAs("ADMIN", null)

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-1" }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe("Sin gimnasio seleccionado")
  })

  it("un admin no puede activar equipos en otro gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1", "gym-2")

    const response = await setActivation(
      jsonRequest(url, "PATCH", { equipmentId: "eq-1", gymId: "gym-2", active: false })
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe("Sin permisos sobre este gimnasio")
    expect(mocks.activationUpsert).not.toHaveBeenCalled()
  })

  it.each(["MEMBER", "TRAINER"])("un %s no puede activar equipos", async (role) => {
    loginAs(role, "gym-1")
    withGyms("gym-1")

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-1" }))

    expect(response.status).toBe(403)
    expect(mocks.activationUpsert).not.toHaveBeenCalled()
  })

  it("responde 404 si el equipo no existe", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-x" }))

    expect(response.status).toBe(404)
    expect(mocks.activationUpsert).not.toHaveBeenCalled()
  })

  it("un admin desactiva un equipo en su gimnasio sin tocar el número ni la imagen", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", isSystem: true, gymId: null })

    const response = await setActivation(
      jsonRequest(url, "PATCH", { equipmentId: "eq-1", active: false })
    )

    expect(response.status).toBe(200)
    expect(mocks.activationUpsert).toHaveBeenCalledWith({
      where: { gymId_equipmentId: { gymId: "gym-1", equipmentId: "eq-1" } },
      update: { active: false },
      create: {
        gymId: "gym-1",
        equipmentId: "eq-1",
        active: false,
        machineNumber: null,
        imageUrl: null,
      },
    })
    expect(mocks.gymUpdate).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({
      success: true,
      active: false,
      machineNumber: null,
      imageUrl: null,
    })
  })

  it("al poner un número de máquina activa la opción de mostrar números en el gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", isSystem: true, gymId: null })

    const response = await setActivation(
      jsonRequest(url, "PATCH", { equipmentId: "eq-1", machineNumber: 7 })
    )

    expect(response.status).toBe(200)
    expect(mocks.activationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { machineNumber: 7 },
        create: expect.objectContaining({ active: true, machineNumber: 7 }),
      })
    )
    expect(mocks.gymUpdate).toHaveBeenCalledWith({
      where: { id: "gym-1" },
      data: { showMachineNumbers: true },
    })
    expect((await response.json()).machineNumber).toBe(7)
  })

  it("el súper admin activa equipos en el gimnasio que indique", async () => {
    loginAs("SUPER_ADMIN", null)
    withGyms("gym-2")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", isSystem: true, gymId: null })

    const response = await setActivation(
      jsonRequest(url, "PATCH", { equipmentId: "eq-1", gymId: "gym-2", active: true })
    )

    expect(response.status).toBe(200)
    expect(mocks.activationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gymId_equipmentId: { gymId: "gym-2", equipmentId: "eq-1" } },
      })
    )
  })

  it("el súper admin sin gimnasio y sin gymId recibe 403", async () => {
    loginAs("SUPER_ADMIN", null)

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-1" }))

    expect(response.status).toBe(403)
  })

  it("con el equipo propio de otro gimnasio responde 404 sin activarlo", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1", "gym-2")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-2", isSystem: false, gymId: "gym-2" })

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-2" }))

    expect(response.status).toBe(404)
    expect(mocks.activationUpsert).not.toHaveBeenCalled()
  })

  it("un admin puede activar el equipo propio de su gimnasio", async () => {
    loginAs("ADMIN", "gym-1")
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", isSystem: false, gymId: "gym-1" })

    const response = await setActivation(jsonRequest(url, "PATCH", { equipmentId: "eq-1" }))

    expect(response.status).toBe(200)
  })

  it("con el gymId de un gimnasio que no existe, el súper admin recibe 404", async () => {
    loginAs("SUPER_ADMIN", null)
    withGyms("gym-1")
    mocks.equipmentFindUnique.mockResolvedValue({ id: "eq-1", isSystem: true, gymId: null })

    const response = await setActivation(
      jsonRequest(url, "PATCH", { equipmentId: "eq-1", gymId: "gym-x" })
    )

    expect(response.status).toBe(404)
    expect(mocks.activationUpsert).not.toHaveBeenCalled()
  })
  it.todo(
    "con un cuerpo que no es JSON debería responder 400; hoy `request.json()` no está protegido y la ruta lanza un error (500 sin cuerpo JSON)"
  )
})
