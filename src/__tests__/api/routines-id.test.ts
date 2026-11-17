import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const planAccess = vi.fn()
  const planFull = vi.fn()
  const routinePlanFindUnique = vi.fn((args: { include?: unknown }) =>
    args.include ? planFull(args) : planAccess(args)
  )
  const routinePlanUpdate = vi.fn()
  const routinePlanDelete = vi.fn()
  const assignedFindFirst = vi.fn()
  const assignedFindUnique = vi.fn()
  const assignedUpdate = vi.fn()
  const getTrainerClientIds = vi.fn()

  return {
    userFindUnique,
    planAccess,
    planFull,
    routinePlanFindUnique,
    routinePlanUpdate,
    routinePlanDelete,
    assignedFindFirst,
    assignedFindUnique,
    assignedUpdate,
    getTrainerClientIds,
    prisma: {
      user: { findUnique: userFindUnique },
      routinePlan: {
        findUnique: routinePlanFindUnique,
        update: routinePlanUpdate,
        delete: routinePlanDelete,
      },
      assignedRoutinePlan: {
        findFirst: assignedFindFirst,
        findUnique: assignedFindUnique,
        update: assignedUpdate,
      },
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

import {
  GET as getRoutine,
  PATCH as updateRoutine,
  DELETE as deleteRoutine,
} from "@/app/api/routines/[id]/route"
import { PATCH as deactivateAssignment } from "@/app/api/routines/assign/[id]/route"

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId })
}

function planOwnedBy(userId: string, gymId: string | null = "gym-1") {
  mocks.planAccess.mockResolvedValue({ userId, user: { gymId } })
}

function args(id = "rp-1", method = "GET", body?: unknown) {
  return [
    new Request(`http://localhost:3000/api/routines/${id}`, {
      method,
      ...(body !== undefined
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    }),
    { params: Promise.resolve({ id }) },
  ] as const
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userFindUnique.mockReset()
  mocks.planAccess.mockReset().mockResolvedValue(null)
  mocks.planFull.mockReset().mockResolvedValue({ id: "rp-1", name: "Fuerza 3 días", splits: [] })
  mocks.routinePlanUpdate
    .mockReset()
    .mockImplementation(async (a: { data: object }) => ({ id: "rp-1", ...a.data }))
  mocks.routinePlanDelete.mockReset().mockResolvedValue({})
  mocks.assignedFindFirst.mockReset().mockResolvedValue(null)
  mocks.assignedFindUnique.mockReset().mockResolvedValue(null)
  mocks.assignedUpdate.mockReset().mockResolvedValue({})
  mocks.getTrainerClientIds.mockReset().mockResolvedValue([])
})

describe("GET /api/routines/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getRoutine(...args())

    expect(response.status).toBe(401)
  })

  it("responde 404 si la rutina no existe", async () => {
    loginAs("TRAINER")

    const response = await getRoutine(...args("rp-x"))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Rutina no encontrada" })
    expect(mocks.planFull).not.toHaveBeenCalled()
  })

  it("el dueño ve su rutina con días y ejercicios", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    planOwnedBy("u-ana")

    const response = await getRoutine(...args())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      plan: { id: "rp-1", name: "Fuerza 3 días", splits: [] },
    })
  })

  it("un coach del mismo gimnasio puede verla", async () => {
    loginAs("TRAINER", "gym-1", "u-otro-coach")
    planOwnedBy("u-ana", "gym-1")

    const response = await getRoutine(...args())

    expect(response.status).toBe(200)
  })

  it("un coach o admin de otro gimnasio recibe 404", async () => {
    loginAs("ADMIN", "gym-2")
    planOwnedBy("u-ana", "gym-1")

    const response = await getRoutine(...args())

    expect(response.status).toBe(404)
    expect(mocks.planFull).not.toHaveBeenCalled()
  })

  it("un miembro sin la rutina asignada recibe 404", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")
    planOwnedBy("u-ana", "gym-1")

    const response = await getRoutine(...args())

    expect(response.status).toBe(404)
    expect(mocks.assignedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u-carlos", planId: "rp-1", active: true } })
    )
  })

  it("un miembro con la rutina asignada y activa puede verla", async () => {
    loginAs("MEMBER", "gym-1", "u-carlos")
    planOwnedBy("u-ana", "gym-1")
    mocks.assignedFindFirst.mockResolvedValue({ id: "arp-1" })

    const response = await getRoutine(...args())

    expect(response.status).toBe(200)
  })
})

describe("PATCH /api/routines/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateRoutine(...args("rp-1", "PATCH", { name: "Nueva" }))

    expect(response.status).toBe(401)
    expect(mocks.routinePlanUpdate).not.toHaveBeenCalled()
  })

  it("responde 403 si la rutina no existe", async () => {
    loginAs("TRAINER")

    const response = await updateRoutine(...args("rp-x", "PATCH", { name: "Nueva" }))

    expect(response.status).toBe(403)
    expect(mocks.routinePlanUpdate).not.toHaveBeenCalled()
  })

  it.each(["TRAINER", "ADMIN", "MEMBER"])(
    "un %s que no es dueño no puede modificarla",
    async (role) => {
      loginAs(role, "gym-1", "u-otro")
      planOwnedBy("u-ana", "gym-1")

      const response = await updateRoutine(...args("rp-1", "PATCH", { name: "Nueva" }))

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({
        error: "No tienes permisos para modificar esta rutina",
      })
      expect(mocks.routinePlanUpdate).not.toHaveBeenCalled()
    }
  )

  it("el dueño actualiza solo los campos enviados", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    planOwnedBy("u-ana")

    const response = await updateRoutine(
      ...args("rp-1", "PATCH", { name: "Fuerza 4 días", frequency: 4, userId: "u-otro" })
    )

    expect(response.status).toBe(200)
    expect(mocks.routinePlanUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rp-1" },
        data: { name: "Fuerza 4 días", frequency: 4 },
      })
    )
  })

  it("el súper admin puede modificar rutinas ajenas", async () => {
    loginAs("SUPER_ADMIN", null, "u-root")
    planOwnedBy("u-ana")

    const response = await updateRoutine(...args("rp-1", "PATCH", { difficulty: "ADVANCED" }))

    expect(response.status).toBe(200)
  })

  it.todo(
    "debería validar el cuerpo y responder 400 en español; hoy acepta un nombre vacío y cualquier tipo de dato (un valor inválido termina en error 500 de Prisma)"
  )
})

describe("DELETE /api/routines/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteRoutine(...args("rp-1", "DELETE"))

    expect(response.status).toBe(401)
    expect(mocks.routinePlanDelete).not.toHaveBeenCalled()
  })

  it("un coach no puede eliminar la rutina de otro coach", async () => {
    loginAs("TRAINER", "gym-1", "u-otro")
    planOwnedBy("u-ana")

    const response = await deleteRoutine(...args("rp-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: "No tienes permisos para eliminar esta rutina",
    })
    expect(mocks.routinePlanDelete).not.toHaveBeenCalled()
  })

  it("el dueño elimina su rutina", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    planOwnedBy("u-ana")

    const response = await deleteRoutine(...args("rp-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mocks.routinePlanDelete).toHaveBeenCalledWith({ where: { id: "rp-1" } })
  })
})

describe("PATCH /api/routines/assign/[id]", () => {
  function assignArgs(id = "arp-1") {
    return [
      new Request(`http://localhost:3000/api/routines/assign/${id}`, { method: "PATCH" }),
      { params: Promise.resolve({ id }) },
    ] as const
  }

  function assignment(userGym = "gym-1", planGym = "gym-1") {
    return {
      id: "arp-1",
      userId: "u-carlos",
      active: true,
      user: { gymId: userGym, assignedTrainerId: "u-ana" },
      plan: { user: { gymId: planGym } },
    }
  }

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deactivateAssignment(...assignArgs())

    expect(response.status).toBe(401)
  })

  it("responde 403 a un miembro", async () => {
    loginAs("MEMBER")

    const response = await deactivateAssignment(...assignArgs())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin permisos" })
    expect(mocks.assignedUpdate).not.toHaveBeenCalled()
  })

  it("responde 404 si la asignación no existe", async () => {
    loginAs("ADMIN")

    const response = await deactivateAssignment(...assignArgs("arp-x"))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Asignación no encontrada" })
  })

  it.each([
    ["el miembro es de otro gimnasio", "gym-2", "gym-1"],
    ["la rutina es de otro gimnasio", "gym-1", "gym-2"],
  ])("un admin recibe 404 si %s", async (_caso, userGym, planGym) => {
    loginAs("ADMIN", "gym-1")
    mocks.assignedFindUnique.mockResolvedValue(assignment(userGym, planGym))

    const response = await deactivateAssignment(...assignArgs())

    expect(response.status).toBe(404)
    expect(mocks.assignedUpdate).not.toHaveBeenCalled()
  })

  it("un coach no puede quitar la rutina a alguien que no es su cliente", async () => {
    loginAs("TRAINER", "gym-1", "u-otro-coach")
    mocks.assignedFindUnique.mockResolvedValue(assignment())
    mocks.getTrainerClientIds.mockResolvedValue(["u-lucia"])

    const response = await deactivateAssignment(...assignArgs())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Sin permisos sobre esta asignación" })
    expect(mocks.assignedUpdate).not.toHaveBeenCalled()
  })

  it("el coach del cliente desactiva la asignación (no la borra)", async () => {
    loginAs("TRAINER", "gym-1", "u-ana")
    mocks.assignedFindUnique.mockResolvedValue(assignment())
    mocks.getTrainerClientIds.mockResolvedValue(["u-carlos"])

    const response = await deactivateAssignment(...assignArgs())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mocks.assignedUpdate).toHaveBeenCalledWith({
      where: { id: "arp-1" },
      data: { active: false },
    })
  })

  it("el admin del gimnasio desactiva la asignación", async () => {
    loginAs("ADMIN", "gym-1")
    mocks.assignedFindUnique.mockResolvedValue(assignment())

    const response = await deactivateAssignment(...assignArgs())

    expect(response.status).toBe(200)
    expect(mocks.assignedUpdate).toHaveBeenCalled()
  })
})
