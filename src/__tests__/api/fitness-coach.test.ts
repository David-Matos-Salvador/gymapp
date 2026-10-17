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
