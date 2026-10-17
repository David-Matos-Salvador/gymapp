import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindUnique = vi.fn()
const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockCreate = vi.fn()
const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    workoutLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
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

import { GET, POST } from "@/app/api/workout-logs/route"

describe("GET /api/workout-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new Request("http://localhost:3000/api/workout-logs")
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("No autorizado")
  })

  it("returns workout logs for authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })
    mockCount.mockResolvedValue(2)
    const mockLogs = [
      { id: "log-1", userId: "user-1", sets: [] },
      { id: "log-2", userId: "user-1", sets: [] },
    ]
    mockFindMany.mockResolvedValue(mockLogs)

    const req = new Request("http://localhost:3000/api/workout-logs")
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.workoutLogs).toEqual(mockLogs)
    expect(body.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 })
  })

  it("returns empty list when no logs exist", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })
    mockCount.mockResolvedValue(0)
    mockFindMany.mockResolvedValue([])

    const req = new Request("http://localhost:3000/api/workout-logs")
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.workoutLogs).toEqual([])
    expect(body.pagination.total).toBe(0)
  })

  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValue({ user: { email: "ghost@test.com" } })
    mockFindUnique.mockResolvedValue(null)

    const req = new Request("http://localhost:3000/api/workout-logs")
    const response = await GET(req)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Usuario no encontrado")
  })
})

describe("POST /api/workout-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new Request("http://localhost:3000/api/workout-logs", {
      method: "POST",
      body: JSON.stringify({
        sets: [{ exerciseId: "ex-1", exerciseName: "Squat", setNumber: 1, reps: 10, weight: 100 }],
      }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("No autorizado")
  })

  it("creates workout log with valid data", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })
    mockCreate.mockResolvedValue({
      id: "log-new",
      userId: "user-1",
      sets: [
        {
          id: "set-1",
          exerciseId: "ex-1",
          exerciseName: "Squat",
          setNumber: 1,
          reps: 10,
          weight: 100,
        },
      ],
    })

    const req = new Request("http://localhost:3000/api/workout-logs", {
      method: "POST",
      body: JSON.stringify({
        duration: 3600,
        notes: "Great workout",
        sets: [{ exerciseId: "ex-1", exerciseName: "Squat", setNumber: 1, reps: 10, weight: 100 }],
      }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.workoutLog).toBeDefined()
    expect(body.workoutLog.id).toBe("log-new")
    expect(mockCreate).toHaveBeenCalled()
  })

  it("returns 400 when sets array is empty", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })

    const req = new Request("http://localhost:3000/api/workout-logs", {
      method: "POST",
      body: JSON.stringify({ sets: [] }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Datos inválidos")
  })

  it("returns 400 when sets are missing completely", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })

    const req = new Request("http://localhost:3000/api/workout-logs", {
      method: "POST",
      body: JSON.stringify({ duration: 3600 }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Datos inválidos")
  })
})
