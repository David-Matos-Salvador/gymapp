import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    routinePlan: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
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

import { GET as getRoutines, POST as postRoutines } from "@/app/api/routines/route"

describe("GET /api/routines", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getRoutines()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("No autorizado")
  })

  it("returns 403 when user is MEMBER", async () => {
    mockAuth.mockResolvedValue({ user: { email: "member@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "member@test.com", role: "MEMBER" })

    const response = await getRoutines()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Sin permisos")
  })

  it("returns plans for authenticated TRAINER", async () => {
    mockAuth.mockResolvedValue({ user: { email: "trainer@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "trainer@test.com", role: "TRAINER" })
    const mockPlans = [{ id: "plan-1", name: "Full Body" }]
    mockFindMany.mockResolvedValue(mockPlans)

    const response = await getRoutines()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.plans).toEqual(mockPlans)
  })
})

describe("POST /api/routines", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new Request("http://localhost:3000/api/routines", {
      method: "POST",
      body: JSON.stringify({ name: "Test Routine" }),
    })
    const response = await postRoutines(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("No autorizado")
  })

  it("creates routine with valid auth and body", async () => {
    mockAuth.mockResolvedValue({ user: { email: "trainer@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "trainer@test.com", role: "TRAINER" })
    const mockPlan = { id: "plan-new", name: "Test Routine" }
    mockCreate.mockResolvedValue(mockPlan)

    const req = new Request("http://localhost:3000/api/routines", {
      method: "POST",
      body: JSON.stringify({ name: "Test Routine", description: "A test plan" }),
    })
    const response = await postRoutines(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.plan).toEqual(mockPlan)
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue({ user: { email: "trainer@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "trainer@test.com", role: "TRAINER" })

    const req = new Request("http://localhost:3000/api/routines", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const response = await postRoutines(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Nombre requerido")
  })
})
