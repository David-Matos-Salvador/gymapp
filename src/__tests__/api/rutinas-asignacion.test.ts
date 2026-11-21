import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const routinePlanFindUnique = vi.fn()
  const routinePlanFindMany = vi.fn()
  const assignedUpdateMany = vi.fn()
  const assignedUpsert = vi.fn()
  const assignedFindFirst = vi.fn()
  const gymExerciseCount = vi.fn()
  const gymExerciseUpsert = vi.fn()
  const workoutLogFindUnique = vi.fn()
  const workoutLogDelete = vi.fn()
  const measurementFindUnique = vi.fn()
  const measurementUpdate = vi.fn()
  const measurementDelete = vi.fn()
  const transaction = vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops))
  const getTrainerClientIds = vi.fn()
  const getWeeklyProgress = vi.fn()
  const getWeeklyStreak = vi.fn()
  const getBestStreak = vi.fn()

  return {
    userFindUnique,
    routinePlanFindUnique,
    routinePlanFindMany,
    assignedUpdateMany,
    assignedUpsert,
    assignedFindFirst,
    gymExerciseCount,
    gymExerciseUpsert,
    workoutLogFindUnique,
    workoutLogDelete,
    measurementFindUnique,
    measurementUpdate,
    measurementDelete,
    transaction,
    getTrainerClientIds,
    getWeeklyProgress,
    getWeeklyStreak,
    getBestStreak,
    prisma: {
      user: { findUnique: userFindUnique },
      routinePlan: { findUnique: routinePlanFindUnique, findMany: routinePlanFindMany },
      assignedRoutinePlan: {
        updateMany: assignedUpdateMany,
        upsert: assignedUpsert,
        findFirst: assignedFindFirst,
      },
      gymExercise: { count: gymExerciseCount, upsert: gymExerciseUpsert },
      workoutLog: { findUnique: workoutLogFindUnique, delete: workoutLogDelete },
      bodyMeasurement: {
        findUnique: measurementFindUnique,
        update: measurementUpdate,
        delete: measurementDelete,
      },
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
}))

vi.mock("@/lib/weekly-progress", () => ({
  getWeeklyProgress: (...args: unknown[]) => mocks.getWeeklyProgress(...args),
  getWeeklyStreak: (...args: unknown[]) => mocks.getWeeklyStreak(...args),
  getBestStreak: (...args: unknown[]) => mocks.getBestStreak(...args),
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

import { POST as assignRoutine } from "@/app/api/onboarding/assign-routine/route"
import { GET as getRecommended } from "@/app/api/recommended-routines/route"
import { GET as getWorkoutLog, DELETE as deleteWorkoutLog } from "@/app/api/workout-logs/[id]/route"
import {
  PATCH as updateMeasurement,
  DELETE as deleteMeasurement,
} from "@/app/api/body-measurements/[id]/route"
import { GET as getWeekly } from "@/app/api/weekly-progress/route"
import { PATCH as toggleGymExercise } from "@/app/api/gym-exercises/route"

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

function assign(body: unknown) {
  return assignRoutine(jsonRequest("/api/onboarding/assign-routine", "POST", body))
}

function plan({
  ownerId = "u-super",
  ownerRole = "SUPER_ADMIN",
  ownerGymId = null as string | null,
  exerciseIds = ["ex-1", "ex-2"],
} = {}) {
  return {
    id: "rp-1",
    name: "Fuerza 3 días",
    description: "Plantilla",
    userId: ownerId,
    user: { id: ownerId, role: ownerRole, gymId: ownerGymId },
    splits: [
      {
        id: "sp-1",
        label: "A",
        name: "Pecho",
        muscleGroups: ["chest"],
        exercises: exerciseIds.map((exerciseId, order) => ({
          exerciseId,
          sets: 3,
          reps: "10",
          weight: 0,
          restSeconds: 60,
          order,
        })),
      },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockReset()
  mocks.userFindUnique.mockReset()
  mocks.routinePlanFindUnique.mockReset().mockResolvedValue(null)
  mocks.routinePlanFindMany.mockReset().mockResolvedValue([])
  mocks.assignedUpdateMany.mockReset().mockResolvedValue({ count: 0 })
  mocks.assignedUpsert.mockReset().mockResolvedValue({})
  mocks.assignedFindFirst.mockReset().mockResolvedValue(null)
  mocks.gymExerciseCount.mockReset().mockResolvedValue(2)
  mocks.gymExerciseUpsert.mockReset().mockResolvedValue({})
  mocks.workoutLogFindUnique.mockReset().mockResolvedValue(null)
  mocks.workoutLogDelete.mockReset().mockResolvedValue({})
  mocks.measurementFindUnique.mockReset().mockResolvedValue(null)
  mocks.measurementUpdate
    .mockReset()
    .mockImplementation(async (a: { data: object }) => ({ id: "bm-1", ...a.data }))
  mocks.measurementDelete.mockReset().mockResolvedValue({})
  mocks.getTrainerClientIds.mockReset().mockResolvedValue([])
  mocks.getWeeklyProgress.mockReset().mockResolvedValue({ completed: 2, target: 3 })
  mocks.getWeeklyStreak.mockReset().mockResolvedValue({ streak: 4 })
  mocks.getBestStreak.mockReset().mockResolvedValue(6)
})

describe("POST /api/onboarding/assign-routine", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await assign({ planId: "rp-1" })

    expect(response.status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 403 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await assign({ planId: "rp-1" })

    expect(response.status).toBe(403)
  })

  it("responde 400 sin planId", async () => {
    loginAs("MEMBER")

    const response = await assign({})

    expect(response.status).toBe(400)
  })

  it("un coach o admin sin memberId no puede asignarse una rutina a sí mismo", async () => {
    loginAs("TRAINER")

    const response = await assign({ planId: "rp-1" })

    expect(response.status).toBe(403)
    expect(mocks.routinePlanFindUnique).not.toHaveBeenCalled()
  })

  it("un miembro no puede asignar rutinas a otro miembro", async () => {
    loginAs("MEMBER")

    const response = await assign({ planId: "rp-1", memberId: "u-otro" })

    expect(response.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("un coach no puede asignar a un miembro que no es su cliente", async () => {
    loginAs("TRAINER")
    mocks.getTrainerClientIds.mockResolvedValue(["u-cliente"])

    const response = await assign({ planId: "rp-1", memberId: "u-ajeno" })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("El miembro no es tu cliente")
  })

  it("un admin no puede asignar a un miembro de otro gimnasio", async () => {
    loginAs("ADMIN")
    mocks.userFindUnique
      .mockResolvedValueOnce({ id: "u-admin", role: "ADMIN", gymId: "gym-1" })
      .mockResolvedValueOnce({ gymId: "gym-2" })

    const response = await assign({ planId: "rp-1", memberId: "u-otro-gym" })

    expect(response.status).toBe(404)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("un admin sin gimnasio no puede asignar rutinas", async () => {
    mockAuth.mockResolvedValue({ user: { email: "admin@gymapp.com" } })
    mocks.userFindUnique
      .mockResolvedValueOnce({ id: "u-admin", role: "ADMIN", gymId: null })
      .mockResolvedValueOnce({ gymId: null })

    const response = await assign({ planId: "rp-1", memberId: "u-sin-gym" })

    expect(response.status).toBe(404)
  })

  it("responde 404 si el plan no existe", async () => {
    loginAs("MEMBER")

    const response = await assign({ planId: "rp-x" })

    expect(response.status).toBe(404)
  })

  it("un miembro no puede tomar la rutina personal de un coach", async () => {
    loginAs("MEMBER")
    mocks.routinePlanFindUnique.mockResolvedValue(
      plan({ ownerId: "u-trainer", ownerRole: "TRAINER", ownerGymId: "gym-1" })
    )

    const response = await assign({ planId: "rp-1" })

    expect(response.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 409 si la plantilla usa ejercicios apagados en tu gimnasio", async () => {
    loginAs("MEMBER")
    mocks.routinePlanFindUnique.mockResolvedValue(plan())
    mocks.gymExerciseCount.mockResolvedValue(1)

    const response = await assign({ planId: "rp-1" })

    expect(response.status).toBe(409)
    expect(mocks.gymExerciseCount).toHaveBeenCalledWith({
      where: { gymId: "gym-1", active: true, exerciseId: { in: ["ex-1", "ex-2"] } },
    })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("un miembro toma una plantilla: desactiva la anterior y activa la nueva", async () => {
    loginAs("MEMBER")
    mocks.routinePlanFindUnique.mockResolvedValue(plan())

    const response = await assign({ planId: "rp-1" })

    expect(response.status).toBe(200)
    expect(mocks.assignedUpdateMany).toHaveBeenCalledWith({
      where: { userId: "u-member", active: true, planId: { not: "rp-1" } },
      data: { active: false },
    })
    expect(mocks.assignedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_planId: { userId: "u-member", planId: "rp-1" } },
        create: { userId: "u-member", planId: "rp-1" },
      })
    )
    const data = await response.json()
    expect(data.plan).toMatchObject({ id: "rp-1", name: "Fuerza 3 días" })
    expect(data.plan.splits[0].exercises).toHaveLength(2)
    expect(data.plan).not.toHaveProperty("user")
  })

  it("un miembro sin gimnasio no revisa ejercicios habilitados", async () => {
    loginAs("MEMBER", null)
    mocks.routinePlanFindUnique.mockResolvedValue(plan())

    const response = await assign({ planId: "rp-1" })

    expect(response.status).toBe(200)
    expect(mocks.gymExerciseCount).not.toHaveBeenCalled()
  })

  it("un coach asigna su propia rutina a su cliente", async () => {
    loginAs("TRAINER")
    mocks.getTrainerClientIds.mockResolvedValue(["u-cliente"])
    mocks.routinePlanFindUnique.mockResolvedValue(
      plan({ ownerId: "u-trainer", ownerRole: "TRAINER", ownerGymId: "gym-1" })
    )

    const response = await assign({ planId: "rp-1", memberId: "u-cliente" })

    expect(response.status).toBe(200)
    expect(mocks.assignedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: "u-cliente", planId: "rp-1" },
      })
    )
  })

  it("un coach no puede asignar la rutina de otro coach", async () => {
    loginAs("TRAINER")
    mocks.getTrainerClientIds.mockResolvedValue(["u-cliente"])
    mocks.routinePlanFindUnique.mockResolvedValue(
      plan({ ownerId: "otro-coach", ownerRole: "TRAINER", ownerGymId: "gym-1" })
    )

    const response = await assign({ planId: "rp-1", memberId: "u-cliente" })

    expect(response.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("un admin no ve planes de otro gimnasio", async () => {
    mockAuth.mockResolvedValue({ user: { email: "admin@gymapp.com" } })
    mocks.userFindUnique
      .mockResolvedValueOnce({ id: "u-admin", role: "ADMIN", gymId: "gym-1" })
      .mockResolvedValueOnce({ gymId: "gym-1" })
    mocks.routinePlanFindUnique.mockResolvedValue(
      plan({ ownerId: "coach-2", ownerRole: "TRAINER", ownerGymId: "gym-2" })
    )

    const response = await assign({ planId: "rp-1", memberId: "u-miembro" })

    expect(response.status).toBe(404)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("un admin asigna una plantilla a un miembro de su gimnasio", async () => {
    mockAuth.mockResolvedValue({ user: { email: "admin@gymapp.com" } })
    mocks.userFindUnique
      .mockResolvedValueOnce({ id: "u-admin", role: "ADMIN", gymId: "gym-1" })
      .mockResolvedValueOnce({ gymId: "gym-1" })
    mocks.routinePlanFindUnique.mockResolvedValue(plan())

    const response = await assign({ planId: "rp-1", memberId: "u-miembro" })

    expect(response.status).toBe(200)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it.todo(
    "con un cuerpo que no es JSON responde 500: `request.json()` no está en un try; debería responder 400"
  )
  it.todo(
    "cuando un coach o admin asigna una plantilla a un miembro no se revisa que los ejercicios estén habilitados en el gimnasio del miembro; si el miembro la toma él mismo, sí (409)"
  )
  it.todo(
    "el súper admin puede mandar un memberId que no existe: no se comprueba y el upsert falla con un error de clave foránea (500 sin try/catch)"
  )
  it.todo(
    "con un coach, getTrainerClientIds se llama sin el gymId: un cliente asignado que esté en otro gimnasio sigue contando como suyo"
  )
})

describe("GET /api/recommended-routines", () => {
  it("devuelve los planes con sus splits y ejercicios, del más reciente al más antiguo", async () => {
    mocks.routinePlanFindMany.mockResolvedValue([{ id: "rp-1", name: "Fuerza", splits: [] }])

    const response = await getRecommended()

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.plans).toHaveLength(1)
    expect(mocks.routinePlanFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: "desc" } })
    )
  })

  it.todo(
    "no pide sesión ni filtra nada: devuelve TODAS las rutinas de la base (personales de coaches y miembros de cualquier gimnasio), no solo las plantillas del súper admin"
  )
})

describe("GET /api/workout-logs/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getWorkoutLog(...withId("/api/workout-logs", "wl-1", "GET"))

    expect(response.status).toBe(401)
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await getWorkoutLog(...withId("/api/workout-logs", "wl-1", "GET"))

    expect(response.status).toBe(404)
  })

  it("responde 404 si el entrenamiento no existe", async () => {
    loginAs("MEMBER")

    const response = await getWorkoutLog(...withId("/api/workout-logs", "wl-x", "GET"))

    expect(response.status).toBe(404)
  })

  it("responde 403 si el entrenamiento es de otra persona", async () => {
    loginAs("MEMBER")
    mocks.workoutLogFindUnique.mockResolvedValue({ id: "wl-1", userId: "otro" })

    const response = await getWorkoutLog(...withId("/api/workout-logs", "wl-1", "GET"))

    expect(response.status).toBe(403)
  })

  it("devuelve tu entrenamiento con sus series ordenadas", async () => {
    loginAs("MEMBER")
    mocks.workoutLogFindUnique.mockResolvedValue({ id: "wl-1", userId: "u-member", sets: [] })

    const response = await getWorkoutLog(...withId("/api/workout-logs", "wl-1", "GET"))

    expect(response.status).toBe(200)
    expect(mocks.workoutLogFindUnique).toHaveBeenCalledWith({
      where: { id: "wl-1" },
      include: { sets: { orderBy: { setNumber: "asc" } }, split: true },
    })
    const data = await response.json()
    expect(data.workoutLog.id).toBe("wl-1")
  })
})

describe("DELETE /api/workout-logs/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteWorkoutLog(...withId("/api/workout-logs", "wl-1", "DELETE"))

    expect(response.status).toBe(401)
  })

  it("responde 404 si el entrenamiento no existe", async () => {
    loginAs("MEMBER")

    const response = await deleteWorkoutLog(...withId("/api/workout-logs", "wl-x", "DELETE"))

    expect(response.status).toBe(404)
    expect(mocks.workoutLogDelete).not.toHaveBeenCalled()
  })

  it("un coach no puede borrar el entrenamiento de su cliente", async () => {
    loginAs("TRAINER")
    mocks.workoutLogFindUnique.mockResolvedValue({ id: "wl-1", userId: "u-cliente" })

    const response = await deleteWorkoutLog(...withId("/api/workout-logs", "wl-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.workoutLogDelete).not.toHaveBeenCalled()
  })

  it("borra tu entrenamiento", async () => {
    loginAs("MEMBER")
    mocks.workoutLogFindUnique.mockResolvedValue({ id: "wl-1", userId: "u-member" })

    const response = await deleteWorkoutLog(...withId("/api/workout-logs", "wl-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(mocks.workoutLogDelete).toHaveBeenCalledWith({ where: { id: "wl-1" } })
  })
})

describe("PATCH /api/body-measurements/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateMeasurement(
      ...withId("/api/body-measurements", "bm-1", "PATCH", { weight: 70 })
    )

    expect(response.status).toBe(401)
  })

  it("responde 404 si la medición no existe", async () => {
    loginAs("MEMBER")

    const response = await updateMeasurement(
      ...withId("/api/body-measurements", "bm-x", "PATCH", { weight: 70 })
    )

    expect(response.status).toBe(404)
  })

  it("responde 403 si la medición es de otra persona", async () => {
    loginAs("MEMBER")
    mocks.measurementFindUnique.mockResolvedValue({ id: "bm-1", userId: "otro" })

    const response = await updateMeasurement(
      ...withId("/api/body-measurements", "bm-1", "PATCH", { weight: 70 })
    )

    expect(response.status).toBe(403)
    expect(mocks.measurementUpdate).not.toHaveBeenCalled()
  })

  it("responde 400 con un valor fuera de rango", async () => {
    loginAs("MEMBER")
    mocks.measurementFindUnique.mockResolvedValue({ id: "bm-1", userId: "u-member" })

    const response = await updateMeasurement(
      ...withId("/api/body-measurements", "bm-1", "PATCH", { weight: 5, bodyFat: 90 })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toHaveProperty("weight")
    expect(data.details).toHaveProperty("bodyFat")
    expect(mocks.measurementUpdate).not.toHaveBeenCalled()
  })

  it("actualiza tu medición", async () => {
    loginAs("MEMBER")
    mocks.measurementFindUnique.mockResolvedValue({ id: "bm-1", userId: "u-member" })

    const response = await updateMeasurement(
      ...withId("/api/body-measurements", "bm-1", "PATCH", { weight: 72.5, notes: "En ayunas" })
    )

    expect(response.status).toBe(200)
    expect(mocks.measurementUpdate).toHaveBeenCalledWith({
      where: { id: "bm-1" },
      data: { weight: 72.5, notes: "En ayunas" },
    })
  })

  it.todo(
    "con un cuerpo que no es JSON responde 500: `request.json()` no está en un try; debería responder 400"
  )
})

describe("DELETE /api/body-measurements/[id]", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await deleteMeasurement(...withId("/api/body-measurements", "bm-1", "DELETE"))

    expect(response.status).toBe(401)
  })

  it("responde 404 si la medición no existe", async () => {
    loginAs("MEMBER")

    const response = await deleteMeasurement(...withId("/api/body-measurements", "bm-x", "DELETE"))

    expect(response.status).toBe(404)
  })

  it("responde 403 si la medición es de otra persona", async () => {
    loginAs("MEMBER")
    mocks.measurementFindUnique.mockResolvedValue({ id: "bm-1", userId: "otro" })

    const response = await deleteMeasurement(...withId("/api/body-measurements", "bm-1", "DELETE"))

    expect(response.status).toBe(403)
    expect(mocks.measurementDelete).not.toHaveBeenCalled()
  })

  it("borra tu medición", async () => {
    loginAs("MEMBER")
    mocks.measurementFindUnique.mockResolvedValue({ id: "bm-1", userId: "u-member" })

    const response = await deleteMeasurement(...withId("/api/body-measurements", "bm-1", "DELETE"))

    expect(response.status).toBe(200)
    expect(mocks.measurementDelete).toHaveBeenCalledWith({ where: { id: "bm-1" } })
  })
})

describe("GET /api/weekly-progress", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getWeekly()

    expect(response.status).toBe(401)
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })
    mocks.userFindUnique.mockResolvedValue(null)

    const response = await getWeekly()

    expect(response.status).toBe(404)
  })

  it("usa la frecuencia de la rutina activa", async () => {
    loginAs("MEMBER")
    mocks.assignedFindFirst.mockResolvedValue({ plan: { frequency: 5 } })

    const response = await getWeekly()

    expect(response.status).toBe(200)
    expect(mocks.getWeeklyProgress).toHaveBeenCalledWith("u-member", 5)
    expect(mocks.getWeeklyStreak).toHaveBeenCalledWith("u-member", 5)
    expect(mocks.getBestStreak).toHaveBeenCalledWith("u-member", 5)
    const data = await response.json()
    expect(data).toEqual({ weeklyCompleted: 2, weeklyTarget: 3, weeklyStreak: 4, bestStreak: 6 })
  })

  it("sin rutina activa usa 3 días por semana", async () => {
    loginAs("MEMBER")

    await getWeekly()

    expect(mocks.getWeeklyProgress).toHaveBeenCalledWith("u-member", 3)
  })
})

describe("PATCH /api/gym-exercises", () => {
  function toggle(body: unknown) {
    return toggleGymExercise(jsonRequest("/api/gym-exercises", "PATCH", body))
  }

  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await toggle({ exerciseId: "ex-1", active: false })

    expect(response.status).toBe(401)
  })

  it.each(["MEMBER", "TRAINER"])("responde 403 a %s", async (role) => {
    loginAs(role)

    const response = await toggle({ exerciseId: "ex-1", active: false })

    expect(response.status).toBe(403)
    expect(mocks.gymExerciseUpsert).not.toHaveBeenCalled()
  })

  it("responde 403 a un admin sin gimnasio", async () => {
    loginAs("ADMIN", null)

    const response = await toggle({ exerciseId: "ex-1", active: false })

    expect(response.status).toBe(403)
  })

  it("responde 400 si falta active", async () => {
    loginAs("ADMIN")

    const response = await toggle({ exerciseId: "ex-1" })

    expect(response.status).toBe(400)
    expect(mocks.gymExerciseUpsert).not.toHaveBeenCalled()
  })

  it("el admin apaga un ejercicio solo en su gimnasio", async () => {
    loginAs("ADMIN")

    const response = await toggle({ exerciseId: "ex-1", active: false })

    expect(response.status).toBe(200)
    expect(mocks.gymExerciseUpsert).toHaveBeenCalledWith({
      where: { gymId_exerciseId: { gymId: "gym-1", exerciseId: "ex-1" } },
      update: { active: false },
      create: { gymId: "gym-1", exerciseId: "ex-1", active: false },
    })
    const data = await response.json()
    expect(data).toEqual({ success: true, active: false })
  })

  it.todo(
    "con un exerciseId que no existe el upsert falla por clave foránea y la ruta responde 500 (no hay try/catch); debería responder 404"
  )
})
