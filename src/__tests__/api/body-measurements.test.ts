import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindUnique = vi.fn()
const mockFindMany = vi.fn()
const mockCreate = vi.fn()
const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    bodyMeasurement: {
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

import { GET, POST } from "@/app/api/body-measurements/route"

describe("GET /api/body-measurements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("No autorizado")
  })

  it("returns measurements for authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })
    const mockMeasurements = [
      { id: "m-1", weight: 80.5, date: new Date().toISOString() },
      { id: "m-2", weight: 79.0, date: new Date().toISOString() },
    ]
    mockFindMany.mockResolvedValue(mockMeasurements)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.measurements).toEqual(mockMeasurements)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { date: "desc" },
    })
  })

  it("returns 404 when user not found", async () => {
    mockAuth.mockResolvedValue({ user: { email: "ghost@test.com" } })
    mockFindUnique.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Usuario no encontrado")
  })
})

describe("POST /api/body-measurements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const req = new Request("http://localhost:3000/api/body-measurements", {
      method: "POST",
      body: JSON.stringify({ weight: 80.5 }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("No autorizado")
  })

  it("creates measurement with valid data", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })
    mockCreate.mockResolvedValue({ id: "m-new", weight: 80.5, userId: "user-1" })

    const req = new Request("http://localhost:3000/api/body-measurements", {
      method: "POST",
      body: JSON.stringify({ weight: 80.5, height: 175, bodyFat: 15 }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.measurement).toBeDefined()
    expect(body.measurement.id).toBe("m-new")
    expect(mockCreate).toHaveBeenCalled()
  })

  it("returns 400 with invalid data", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "MEMBER" })

    const req = new Request("http://localhost:3000/api/body-measurements", {
      method: "POST",
      body: JSON.stringify({ weight: -5 }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Datos inválidos")
  })
})
