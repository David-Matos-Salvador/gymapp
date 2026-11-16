import { describe, it, expect, vi, beforeEach } from "vitest"

const mockUserFindUnique = vi.fn()
const mockPlanFindMany = vi.fn()
const mockAuth = vi.fn()
const mockRateLimit = vi.fn()
const mockRecommend = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    routinePlan: { findMany: (...args: unknown[]) => mockPlanFindMany(...args) },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock("@/lib/ai-routine-recommendation", () => ({
  recommendRoutineWithAI: (...args: unknown[]) => mockRecommend(...args),
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

import { POST } from "@/app/api/onboarding/recommendation/route"

const validBody = {
  objective: "MUSCLE_GAIN",
  experienceLevel: "BEGINNER",
  trainingFrequency: 3,
  physicalConditions: ["Lesión", "Embarazo"],
  planIds: ["p2", "p1"],
}

const templates = [
  { id: "p1", name: "Base para empezar", difficulty: "BEGINNER", splits: [] },
  { id: "p2", name: "Empuje / Tirón / Piernas", difficulty: "INTERMEDIATE", splits: [] },
]

function ask(body: unknown = validBody) {
  return POST(
    new Request("http://localhost/api/onboarding/recommendation", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { email: "miembro@test.com" } })
  mockUserFindUnique.mockResolvedValue({ id: "u1", role: "MEMBER" })
  mockRateLimit.mockResolvedValue(true)
  mockPlanFindMany.mockResolvedValue(templates)
  mockRecommend.mockResolvedValue({ planId: "p1", reason: "Empiezas con lo básico." })
})

describe("POST /api/onboarding/recommendation (#117)", () => {
  it("sin sesión responde 401", async () => {
    mockAuth.mockResolvedValue(null)
    expect((await ask()).status).toBe(401)
    expect(mockRecommend).not.toHaveBeenCalled()
  })

  it("con datos inválidos responde 400 sin llamar a la IA", async () => {
    expect((await ask({ ...validBody, planIds: ["p1"] })).status).toBe(400)
    expect((await ask({ ...validBody, objective: "VOLAR" })).status).toBe(400)
    expect((await ask("no es json")).status).toBe(400)
    expect(mockRecommend).not.toHaveBeenCalled()
  })

  it("devuelve la recomendación de la IA", async () => {
    const res = await ask()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      recommendation: { planId: "p1", reason: "Empiezas con lo básico." },
    })
  })

  it("a la IA solo le pasa experiencia, días, objetivo y si hay lesión", async () => {
    await ask()
    const [profile, options] = mockRecommend.mock.calls[0]
    expect(profile).toEqual({
      objective: "MUSCLE_GAIN",
      experienceLevel: "BEGINNER",
      trainingFrequency: 3,
      hasInjury: true,
    })
    // Las opciones van en el orden en que se muestran en pantalla.
    expect(options.map((o: { id: string }) => o.id)).toEqual(["p2", "p1"])
  })

  it("sin lesión marcada, envía que no hay lesión", async () => {
    await ask({ ...validBody, physicalConditions: ["No poseo"] })
    expect(mockRecommend.mock.calls[0][0].hasInjury).toBe(false)
  })

  it("solo considera plantillas del sistema", async () => {
    await ask()
    expect(mockPlanFindMany.mock.calls[0][0].where).toEqual({
      id: { in: ["p2", "p1"] },
      user: { role: "SUPER_ADMIN" },
    })
  })

  it("aplica el límite por usuario y, si se pasa, responde sin recomendación", async () => {
    mockRateLimit.mockResolvedValue(false)
    const res = await ask()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ recommendation: null })
    expect(mockRateLimit).toHaveBeenCalledWith("ai-recommendation:u1", 5, 86400)
    expect(mockRecommend).not.toHaveBeenCalled()
  })

  it("si la IA no responde, devuelve null sin error", async () => {
    mockRecommend.mockResolvedValue(null)
    const res = await ask()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ recommendation: null })
  })

  it("solo recomienda en el onboarding propio del miembro", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "t1", role: "TRAINER" })
    const res = await ask()
    expect(await res.json()).toEqual({ recommendation: null })
    expect(mockRecommend).not.toHaveBeenCalled()
  })
})
