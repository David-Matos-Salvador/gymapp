import { existsSync } from "node:fs"
import path from "node:path"
import { describe, it, expect, vi, beforeEach } from "vitest"

type StoredExercise = {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  userId?: string
}

type ExerciseNameFilter = string | { equals?: string; mode?: string }

type ExerciseFindFirstArgs = {
  where?: { name?: ExerciseNameFilter }
}

type ExerciseUpsertArgs = {
  where: { name: string }
  create: Omit<StoredExercise, "id">
}

type RoutinePlanCreateArgs = {
  data: {
    name: string
    description?: string | null
    objective?: string | null
    frequency?: number | null
    difficulty?: string | null
  }
}

const h = vi.hoisted(() => {
  const RACE_NAME = "Press de banca"
  const exercises: StoredExercise[] = []
  let exerciseSeq = 0
  let planSeq = 0
  let p2002Count = 0
  let raceBarrier: { count: number; promise: Promise<void>; resolve: () => void } | null = null

  function waitForRacePartner(): Promise<void> {
    if (!raceBarrier) {
      let resolve = () => {}
      const promise = new Promise<void>((done) => {
        resolve = done
      })
      raceBarrier = { count: 0, promise, resolve }
    }

    raceBarrier.count += 1
    if (raceBarrier.count >= 2) raceBarrier.resolve()
    return raceBarrier.promise
  }

  const userFindUnique = vi.fn(async () => ({ id: "member-1", role: "MEMBER" }))
  const userFindFirst = vi.fn(async () => ({ id: "super-1" }))

  const planFindFirst = vi.fn(async () => null)
  const planCreate = vi.fn(async (args: RoutinePlanCreateArgs) => ({
    id: `plan-${++planSeq}`,
    name: args.data.name,
    description: args.data.description ?? null,
    objective: args.data.objective ?? null,
    frequency: args.data.frequency ?? null,
    difficulty: args.data.difficulty ?? null,
    splits: [],
  }))
  const splitUpdate = vi.fn(async (_args: unknown) => ({}))
  const planFindUniqueOrThrow = vi.fn(async (_args: unknown) => ({
    name: "Full Body · Ganancia muscular · 3d",
    splits: [],
  }))
  const assignedFindMany = vi.fn(async () => [])

  const exerciseFindFirst = vi.fn(async (args: ExerciseFindFirstArgs) => {
    const nameFilter = args.where?.name
    const name = typeof nameFilter === "string" ? nameFilter : (nameFilter?.equals ?? "")
    const insensitive = typeof nameFilter === "object" && nameFilter?.mode === "insensitive"

    if (name === RACE_NAME) {
      // Force both concurrent requests to miss before either one can write.
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, 100))
      await Promise.race([waitForRacePartner(), timeout])
    }

    const found = exercises.find((item) =>
      insensitive ? item.name.toLowerCase() === name.toLowerCase() : item.name === name
    )
    return found ? { id: found.id } : null
  })

  const exerciseUpsert = vi.fn(async (args: ExerciseUpsertArgs) => {
    // Yield once so concurrent callers can interleave before the write.
    await Promise.resolve()

    if (exercises.some((item) => item.name === args.where.name)) {
      p2002Count += 1
      throw Object.assign(new Error("Unique constraint failed on the fields: (`name`)"), {
        code: "P2002",
      })
    }

    const created: StoredExercise = { id: `ex-${++exerciseSeq}`, ...args.create }
    exercises.push(created)
    return { id: created.id }
  })

  return {
    userFindUnique,
    userFindFirst,
    planFindFirst,
    planCreate,
    splitUpdate,
    planFindUniqueOrThrow,
    assignedFindMany,
    exerciseFindFirst,
    exerciseUpsert,
    reset() {
      exercises.length = 0
      exerciseSeq = 0
      planSeq = 0
      p2002Count = 0
      raceBarrier = null
    },
    getExercises() {
      return exercises
    },
    getP2002Count() {
      return p2002Count
    },
  }
})

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { email: "laura@gymapp.com" } })),
}))

vi.mock("@/lib/trainer-client", () => ({
  getTrainerClientIds: vi.fn(async () => []),
  hasAnyTrainer: vi.fn(async () => false),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: h.userFindUnique,
      findFirst: h.userFindFirst,
    },
    routinePlan: {
      findFirst: h.planFindFirst,
      create: h.planCreate,
      findUniqueOrThrow: h.planFindUniqueOrThrow,
    },
    routineSplit: {
      update: h.splitUpdate,
    },
    assignedRoutinePlan: {
      findMany: h.assignedFindMany,
    },
    exercise: {
      findFirst: h.exerciseFindFirst,
      upsert: h.exerciseUpsert,
    },
  },
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

import { POST } from "@/app/api/fitness-coach/route"

function onboardingRequest() {
  return new Request("http://localhost:3115/api/fitness-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objective: "MUSCLE_GAIN",
      experienceLevel: "ELITE",
      trainingFrequency: 5,
    }),
  })
}

describe("POST /api/fitness-coach", () => {
  beforeEach(() => {
    h.reset()
  })

  it("resolves concurrent creations of the same exercise without P2002", async () => {
    const [first, second] = await Promise.all([
      POST(onboardingRequest()),
      POST(onboardingRequest()),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    // The race was exercised and recovered through the P2002 fallback.
    expect(h.getP2002Count()).toBeGreaterThan(0)

    const names = h.getExercises().map((exercise) => exercise.name)
    expect(names.length).toBeGreaterThan(0)

    const normalizedNames = names.map((name) => name.toLowerCase())
    expect(new Set(normalizedNames).size).toBe(names.length)
  })

  it("repite ejercicios entre días en Full Body para que ninguna división quede corta", async () => {
    const response = await POST(
      new Request("http://localhost:3115/api/fitness-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: "MUSCLE_GAIN",
          experienceLevel: "BEGINNER",
          trainingFrequency: 3,
        }),
      })
    )
    expect(response.status).toBe(200)

    const fullBodyCall = h.planCreate.mock.calls.find(([args]) =>
      args.data.name.startsWith("Full Body")
    )
    const splits = (
      fullBodyCall![0].data as unknown as {
        splits: { create: { exercises: { create: unknown[] } }[] }
      }
    ).splits.create
    expect(splits).toHaveLength(3)
    for (const split of splits) {
      expect(split.exercises.create).toHaveLength(3)
    }
  })

  it("regenera las divisiones cortas de una rutina guardada sin borrar el plan", async () => {
    const mkSplit = (id: string, count: number) => ({
      id,
      muscleGroups: ["FULL_BODY"],
      exercises: Array.from({ length: count }, (_, i) => ({ id: `e${i}` })),
    })
    h.planFindFirst.mockResolvedValueOnce({
      id: "plan-viejo",
      splits: [mkSplit("s1", 3), mkSplit("s2", 0), mkSplit("s3", 1)],
    } as never)

    const response = await POST(
      new Request("http://localhost:3115/api/fitness-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: "MUSCLE_GAIN",
          experienceLevel: "BEGINNER",
          trainingFrequency: 3,
        }),
      })
    )
    expect(response.status).toBe(200)

    type UpdateArgs = { where: { id: string }; data: { exercises: { create: unknown[] } } }
    const calls = h.splitUpdate.mock.calls.map(([args]) => args as UpdateArgs)
    expect(calls.map((c) => c.where.id)).toEqual(["s2", "s3"])
    expect(calls[0].data.exercises.create.length).toBeGreaterThanOrEqual(2)
  })

  function pedir(experienceLevel: string, trainingFrequency: number) {
    return POST(
      new Request("http://localhost:3115/api/fitness-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: "WEIGHT_LOSS", experienceLevel, trainingFrequency }),
      })
    )
  }

  it.each([3, 4, 5])(
    "a quien recién empieza y elige %i días le ofrece primero una rutina de principiante",
    async (dias) => {
      const response = await pedir("BEGINNER", dias)
      expect(response.status).toBe(200)

      const { plans } = (await response.json()) as { plans: { difficulty: string }[] }
      expect(plans[0].difficulty).toBe("BEGINNER")
    }
  )

  it.each(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"])(
    "con 5 días, la primera opción para %s es la de su nivel o la más cercana",
    async (nivel) => {
      const orden = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]
      const response = await pedir(nivel, 5)
      const { plans } = (await response.json()) as { plans: { difficulty: string }[] }

      const distancias = plans.map((p) =>
        Math.abs(orden.indexOf(p.difficulty) - orden.indexOf(nivel))
      )
      expect(distancias).toEqual([...distancias].sort((a, b) => a - b))
    }
  )

  it("arma la rutina de principiante con volumen de principiante aunque la pida alguien de élite", async () => {
    h.planCreate.mockClear()
    const response = await pedir("ELITE", 5)
    expect(response.status).toBe(200)

    const llamada = h.planCreate.mock.calls.find(([args]) => args.data.difficulty === "BEGINNER")
    expect(llamada).toBeDefined()
    const splits = (
      llamada![0].data as unknown as {
        splits: { create: { exercises: { create: { sets: number }[] } }[] }
      }
    ).splits.create
    expect(splits).toHaveLength(5)
    for (const split of splits) {
      expect(split.exercises.create.length).toBeGreaterThanOrEqual(2)
      expect(split.exercises.create.length).toBeLessThanOrEqual(3)
      for (const ejercicio of split.exercises.create) {
        expect(ejercicio.sets).toBeLessThanOrEqual(4)
      }
    }
  })

  it("ya no existe la ruta sin uso /api/onboarding/recommended-routine", () => {
    expect(
      existsSync(path.join(process.cwd(), "src/app/api/onboarding/recommended-routine/route.ts"))
    ).toBe(false)
  })

  it("canonicalizes pool names to the seed spelling", async () => {
    const response = await POST(onboardingRequest())
    expect(response.status).toBe(200)

    const names = h.getExercises().map((exercise) => exercise.name)
    expect(names).toContain("Face Pull")
    expect(names).toContain("Curl con cable")
    expect(names).not.toContain("Face pull")
    expect(names).not.toContain("Curl en polea")
  })
})
