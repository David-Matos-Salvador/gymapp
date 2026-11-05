import { describe, it, expect, vi, beforeEach } from "vitest"

const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockMeasurementCount = vi.fn()
const mockAssignmentFindFirst = vi.fn()
const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    bodyMeasurement: {
      count: (...args: unknown[]) => mockMeasurementCount(...args),
      create: vi.fn(),
    },
    assignedRoutinePlan: {
      findFirst: (...args: unknown[]) => mockAssignmentFindFirst(...args),
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/trainer-client", () => ({
  getTrainerClientIds: vi.fn(async () => []),
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), { status: init?.status ?? 200 })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { POST } from "@/app/api/onboarding/route"
import { POST as REOPEN } from "@/app/api/onboarding/reopen/route"

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )
}

const answers = {
  objective: "GENERAL_FITNESS",
  experienceLevel: "BEGINNER",
  trainingFrequency: 3,
  weight: 63,
  height: 165,
}

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { email: "m@test.com" } })
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "MEMBER", gymId: null })
    mockMeasurementCount.mockResolvedValue(1)
  })

  it("guarda las respuestas sin marcar terminado con complete: false", async () => {
    const res = await post({ ...answers, complete: false })

    expect(res.status).toBe(200)
    const data = mockUserUpdate.mock.calls[0][0].data
    expect(data.onboardingCompleted).toBeUndefined()
    expect(data.onboardingCompletedAt).toBeUndefined()
    expect(data.onboardingData.complete).toBeUndefined()
    expect(data.trainingFrequency).toBe(3)
  })

  it("marca terminado al elegir una rutina", async () => {
    await post(answers)

    const data = mockUserUpdate.mock.calls[0][0].data
    expect(data.onboardingCompleted).toBe(true)
    expect(data.onboardingCompletedAt).toBeInstanceOf(Date)
  })
})

describe("POST /api/onboarding/reopen", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { email: "m@test.com" } })
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "MEMBER" })
  })

  it("reabre el onboarding de un miembro sin rutina", async () => {
    mockAssignmentFindFirst.mockResolvedValue(null)

    const res = await REOPEN()

    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { onboardingCompleted: false, onboardingCompletedAt: null },
    })
  })

  it("no reabre si ya tiene una rutina", async () => {
    mockAssignmentFindFirst.mockResolvedValue({ id: "a1" })

    const res = await REOPEN()

    expect(res.status).toBe(409)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })
})
