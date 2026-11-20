import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const routinePlanFindUnique = vi.fn()
  const splitFindUnique = vi.fn()
  const splitCreate = vi.fn()
  const splitUpdate = vi.fn()
  const splitDelete = vi.fn()
  const splitExerciseFindUnique = vi.fn()
  const splitExerciseCreate = vi.fn()
  const splitExerciseUpdate = vi.fn()
  const splitExerciseDelete = vi.fn()
  const gymExerciseFindUnique = vi.fn()
  const getSplitForWorkout = vi.fn()

  return {
    userFindUnique,
    routinePlanFindUnique,
    splitFindUnique,
    splitCreate,
    splitUpdate,
    splitDelete,
    splitExerciseFindUnique,
    splitExerciseCreate,
    splitExerciseUpdate,
    splitExerciseDelete,
    gymExerciseFindUnique,
    getSplitForWorkout,
    prisma: {
      user: { findUnique: userFindUnique },
      routinePlan: { findUnique: routinePlanFindUnique },
      routineSplit: {
        findUnique: splitFindUnique,
        create: splitCreate,
        update: splitUpdate,
        delete: splitDelete,
      },
      routineSplitExercise: {
        findUnique: splitExerciseFindUnique,
        create: splitExerciseCreate,
        update: splitExerciseUpdate,
        delete: splitExerciseDelete,
      },
      gymExercise: { findUnique: gymExerciseFindUnique },
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/workout-split", () => ({
  getSplitForWorkout: (...args: unknown[]) => mocks.getSplitForWorkout(...args),
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

import { POST as createSplit } from "@/app/api/routine-splits/route"
import {
  GET as getSplit,
  PATCH as updateSplit,
  DELETE as deleteSplit,
} from "@/app/api/routine-splits/[id]/route"
import { POST as addExercise } from "@/app/api/split-exercises/route"
import {
  PATCH as updateSplitExercise,
  DELETE as deleteSplitExercise,
} from "@/app/api/split-exercises/[id]/route"

function loginAs(role: string, gymId: string | null = "gym-1", id = `u-${role.toLowerCase()}`) {
  mockAuth.mockResolvedValue({ user: { email: `${id}@gymapp.com` } })
  mocks.userFindUnique.mockResolvedValue({ id, role, gymId })
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

const validSplit = { planId: "rp-1", label: "A", name: "Pecho y tríceps" }
const validExercise = { splitId: "sp-1", exerciseId: "ex-1" }

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockReset()
  mocks.userFindUnique.mockReset()
  mocks.routinePlanFindUnique.mockReset().mockResolvedValue(null)
  mocks.splitFindUnique.mockReset().mockResolvedValue(null)
  mocks.splitCreate
    .mockReset()
    .mockImplementation(async (a: { data: object }) => ({ id: "sp-new", ...a.data, exercises: [] }))
  mocks.splitUpdate
    .mockReset()
    .mockImplementation(async (a: { data: object }) => ({ id: "sp-1", ...a.data, exercises: [] }))
  mocks.splitDelete.mockReset().mockResolvedValue({})
  mocks.splitExerciseFindUnique.mockReset().mockResolvedValue(null)
  mocks.splitExerciseCreate
    .mockReset()
    .mockImplementation(async (a: { data: object }) => ({ id: "se-new", ...a.data }))
  mocks.splitExerciseUpdate
    .mockReset()
    .mockImplementation(async (a: { data: object }) => ({ id: "se-1", ...a.data }))
  mocks.splitExerciseDelete.mockReset().mockResolvedValue({})
  mocks.gymExerciseFindUnique.mockReset().mockResolvedValue({ active: true })
  mocks.getSplitForWorkout.mockReset().mockResolvedValue(null)
})

describe("POST /api/routine-splits", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(401)
    expect(mocks.splitCreate).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(404)
  })

  it("responde 400 si falta el nombre o la etiqueta", async () => {
    loginAs("TRAINER")

    const response = await createSplit(
      jsonRequest("/api/routine-splits", "POST", { planId: "rp-1", label: "", name: "" })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toHaveProperty("label")
    expect(data.details).toHaveProperty("name")
    expect(mocks.splitCreate).not.toHaveBeenCalled()
  })

  it("responde 403 si la rutina es de otra persona", async () => {
    loginAs("TRAINER")
    mocks.routinePlanFindUnique.mockResolvedValue({ userId: "otro-coach" })

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(403)
    expect(mocks.splitCreate).not.toHaveBeenCalled()
  })

  it("un admin no puede agregar splits a la rutina de un coach", async () => {
    loginAs("ADMIN")
    mocks.routinePlanFindUnique.mockResolvedValue({ userId: "u-trainer" })

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(403)
  })

  it("responde 403 si la rutina no existe", async () => {
    loginAs("TRAINER")

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(403)
  })

  it("el dueño de la rutina crea el split con valores por defecto", async () => {
    loginAs("TRAINER")
    mocks.routinePlanFindUnique.mockResolvedValue({ userId: "u-trainer" })

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(201)
    expect(mocks.splitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          planId: "rp-1",
          label: "A",
          name: "Pecho y tríceps",
          description: null,
          muscleGroups: [],
          estimatedDuration: null,
          difficulty: null,
          order: 0,
        },
      })
    )
    const data = await response.json()
    expect(data.split.id).toBe("sp-new")
  })

  it("el súper admin puede agregar splits a cualquier rutina", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.routinePlanFindUnique.mockResolvedValue({ userId: "u-trainer" })

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(201)
  })

  it("responde 500 si falla la base de datos al crear", async () => {
    loginAs("TRAINER")
    mocks.routinePlanFindUnique.mockResolvedValue({ userId: "u-trainer" })
    mocks.splitCreate.mockRejectedValue(new Error("db caída"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await createSplit(jsonRequest("/api/routine-splits", "POST", validSplit))

    expect(response.status).toBe(500)
  })

  it.todo(
    "con una rutina que no existe responde 403 «No tienes permisos»; debería responder 404 como el resto de rutas de rutinas"
  )
  it.todo(
    "con un cuerpo que no es JSON responde 500 (el error de `request.json()` cae en el catch); debería responder 400"
  )
})

describe("GET /api/routine-splits/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getSplit(...withId("/api/routine-splits", "sp-1", "GET"))

    expect(response.status).toBe(401)
    expect(mocks.getSplitForWorkout).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await getSplit(...withId("/api/routine-splits", "sp-1", "GET"))

    expect(response.status).toBe(404)
  })

  it("responde 404 si el split no existe o no lo puedes ver", async () => {
    loginAs("MEMBER")

    const response = await getSplit(...withId("/api/routine-splits", "sp-1", "GET"))

    expect(response.status).toBe(404)
    expect(mocks.getSplitForWorkout).toHaveBeenCalledWith("sp-1", {
      id: "u-member",
      role: "MEMBER",
      gymId: "gym-1",
    })
  })

  it("devuelve los datos del split para entrenar", async () => {
    loginAs("MEMBER")
    mocks.getSplitForWorkout.mockResolvedValue({ split: { id: "sp-1", name: "Pierna" } })

    const response = await getSplit(...withId("/api/routine-splits", "sp-1", "GET"))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.split.name).toBe("Pierna")
  })
})

describe("PATCH /api/routine-splits/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateSplit(
      ...withId("/api/routine-splits", "sp-1", "PATCH", { name: "Nuevo" })
    )

    expect(response.status).toBe(401)
  })

  it("responde 403 si el split es de la rutina de otra persona", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "otro-coach" } })

    const response = await updateSplit(
      ...withId("/api/routine-splits", "sp-1", "PATCH", { name: "Nuevo" })
    )

    expect(response.status).toBe(403)
    expect(mocks.splitUpdate).not.toHaveBeenCalled()
  })

  it("responde 403 si el split no existe", async () => {
    loginAs("TRAINER")

    const response = await updateSplit(
      ...withId("/api/routine-splits", "sp-x", "PATCH", { name: "Nuevo" })
    )

    expect(response.status).toBe(403)
  })

  it("responde 400 con datos inválidos", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })

    const response = await updateSplit(
      ...withId("/api/routine-splits", "sp-1", "PATCH", { name: "", order: 1.5 })
    )

    expect(response.status).toBe(400)
    expect(mocks.splitUpdate).not.toHaveBeenCalled()
  })

  it("el dueño actualiza solo los campos enviados", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })

    const response = await updateSplit(
      ...withId("/api/routine-splits", "sp-1", "PATCH", { name: "Espalda", order: 2 })
    )

    expect(response.status).toBe(200)
    expect(mocks.splitUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sp-1" }, data: { name: "Espalda", order: 2 } })
    )
    const data = await response.json()
    expect(data.split.name).toBe("Espalda")
  })

  it("el súper admin puede editar el split de cualquier rutina", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })

    const response = await updateSplit(
      ...withId("/api/routine-splits", "sp-1", "PATCH", { name: "Espalda" })
    )

    expect(response.status).toBe(200)
  })

  it.todo(
    "con un split que no existe responde 403 «No tienes permisos para modificar este split»; debería responder 404"
  )
})

describe("DELETE /api/routine-splits/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteSplit(...withId("/api/routine-splits", "sp-1", "DELETE"))

    expect(response.status).toBe(401)
  })

  it("responde 403 si el split es de la rutina de otra persona", async () => {
    loginAs("MEMBER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })

    const response = await deleteSplit(...withId("/api/routine-splits", "sp-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.splitDelete).not.toHaveBeenCalled()
  })

  it("el dueño elimina el split", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })

    const response = await deleteSplit(...withId("/api/routine-splits", "sp-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(mocks.splitDelete).toHaveBeenCalledWith({ where: { id: "sp-1" } })
  })

  it("responde 500 si falla la base de datos al eliminar", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })
    mocks.splitDelete.mockRejectedValue(new Error("db caída"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await deleteSplit(...withId("/api/routine-splits", "sp-1", "DELETE"))

    expect(response.status).toBe(500)
  })
})

describe("POST /api/split-exercises", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await addExercise(jsonRequest("/api/split-exercises", "POST", validExercise))

    expect(response.status).toBe(401)
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await addExercise(jsonRequest("/api/split-exercises", "POST", validExercise))

    expect(response.status).toBe(404)
  })

  it("responde 400 con series, peso o descanso fuera de rango", async () => {
    loginAs("TRAINER")

    const response = await addExercise(
      jsonRequest("/api/split-exercises", "POST", {
        ...validExercise,
        sets: 0,
        weight: -5,
        restSeconds: 4000,
      })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(Object.keys(data.details)).toEqual(
      expect.arrayContaining(["sets", "weight", "restSeconds"])
    )
    expect(mocks.splitExerciseCreate).not.toHaveBeenCalled()
  })

  it("responde 403 si el split es de la rutina de otra persona", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "otro-coach" } })

    const response = await addExercise(jsonRequest("/api/split-exercises", "POST", validExercise))

    expect(response.status).toBe(403)
    expect(mocks.splitExerciseCreate).not.toHaveBeenCalled()
  })

  it("responde 400 si el ejercicio no está habilitado en tu gimnasio", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })
    mocks.gymExerciseFindUnique.mockResolvedValue({ active: false })

    const response = await addExercise(jsonRequest("/api/split-exercises", "POST", validExercise))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe("El ejercicio no está habilitado para tu gimnasio")
    expect(mocks.gymExerciseFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gymId_exerciseId: { gymId: "gym-1", exerciseId: "ex-1" } },
      })
    )
    expect(mocks.splitExerciseCreate).not.toHaveBeenCalled()
  })

  it("responde 400 si el ejercicio nunca se configuró en tu gimnasio", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })
    mocks.gymExerciseFindUnique.mockResolvedValue(null)

    const response = await addExercise(jsonRequest("/api/split-exercises", "POST", validExercise))

    expect(response.status).toBe(400)
  })

  it("agrega el ejercicio con valores por defecto", async () => {
    loginAs("TRAINER")
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })

    const response = await addExercise(jsonRequest("/api/split-exercises", "POST", validExercise))

    expect(response.status).toBe(201)
    expect(mocks.splitExerciseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          splitId: "sp-1",
          exerciseId: "ex-1",
          sets: 3,
          reps: "10",
          weight: 0,
          restSeconds: 60,
          order: 0,
          notes: null,
        },
      })
    )
  })

  it("sin gimnasio (súper admin) no revisa los ejercicios habilitados", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.splitFindUnique.mockResolvedValue({ plan: { userId: "u-trainer" } })

    const response = await addExercise(jsonRequest("/api/split-exercises", "POST", validExercise))

    expect(response.status).toBe(201)
    expect(mocks.gymExerciseFindUnique).not.toHaveBeenCalled()
  })

  it.todo(
    "con un split que no existe responde 403 «No tienes permisos para modificar esta rutina»; debería responder 404"
  )
})

describe("PATCH /api/split-exercises/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateSplitExercise(
      ...withId("/api/split-exercises", "se-1", "PATCH", { sets: 4 })
    )

    expect(response.status).toBe(401)
  })

  it("responde 403 si el ejercicio es de la rutina de otra persona", async () => {
    loginAs("TRAINER")
    mocks.splitExerciseFindUnique.mockResolvedValue({
      split: { plan: { userId: "otro-coach" } },
    })

    const response = await updateSplitExercise(
      ...withId("/api/split-exercises", "se-1", "PATCH", { sets: 4 })
    )

    expect(response.status).toBe(403)
    expect(mocks.splitExerciseUpdate).not.toHaveBeenCalled()
  })

  it("responde 400 con tipos inválidos", async () => {
    loginAs("TRAINER")
    mocks.splitExerciseFindUnique.mockResolvedValue({ split: { plan: { userId: "u-trainer" } } })

    const response = await updateSplitExercise(
      ...withId("/api/split-exercises", "se-1", "PATCH", { sets: "cuatro" })
    )

    expect(response.status).toBe(400)
    expect(mocks.splitExerciseUpdate).not.toHaveBeenCalled()
  })

  it("el dueño actualiza series y repeticiones", async () => {
    loginAs("TRAINER")
    mocks.splitExerciseFindUnique.mockResolvedValue({ split: { plan: { userId: "u-trainer" } } })

    const response = await updateSplitExercise(
      ...withId("/api/split-exercises", "se-1", "PATCH", { sets: 4, reps: "8-10" })
    )

    expect(response.status).toBe(200)
    expect(mocks.splitExerciseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "se-1" }, data: { sets: 4, reps: "8-10" } })
    )
    const data = await response.json()
    expect(data.splitExercise.sets).toBe(4)
  })

  it.todo(
    "PATCH acepta series, peso o descanso negativos o enormes (p. ej. sets: -3, weight: 99999); POST sí limita sets 1-50, weight 0-1000 y restSeconds 0-3600"
  )
})

describe("DELETE /api/split-exercises/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteSplitExercise(...withId("/api/split-exercises", "se-1", "DELETE"))

    expect(response.status).toBe(401)
  })

  it("responde 403 si el ejercicio no existe o es de otra persona", async () => {
    loginAs("TRAINER")

    const response = await deleteSplitExercise(...withId("/api/split-exercises", "se-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.splitExerciseDelete).not.toHaveBeenCalled()
  })

  it("el súper admin elimina el ejercicio de cualquier rutina", async () => {
    loginAs("SUPER_ADMIN", null)
    mocks.splitExerciseFindUnique.mockResolvedValue({ split: { plan: { userId: "u-trainer" } } })

    const response = await deleteSplitExercise(...withId("/api/split-exercises", "se-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(mocks.splitExerciseDelete).toHaveBeenCalledWith({ where: { id: "se-1" } })
  })
})
