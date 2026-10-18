import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockGymFindFirst = vi.fn().mockResolvedValue({ id: "gym-1", active: true })

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    gym: {
      findFirst: (...args: unknown[]) => mockGymFindFirst(...args),
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "gym-1", name: "Test Gym" }),
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

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}))

import { POST } from "@/app/api/auth/register/route"

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("registers a new user with valid data", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: "user-new",
      email: "test@example.com",
      name: "Test User",
      role: "MEMBER",
    })

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "Password1",
      }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.message).toBe("Usuario registrado exitosamente")
    expect(body.user).toHaveProperty("id", "user-new")
    expect(body.user).toHaveProperty("email", "test@example.com")
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: "test@example.com" } })
  })

  it("rejects public registration as ADMIN", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Admin Attempt",
        email: "admin-attempt@example.com",
        password: "Password1",
        role: "ADMIN",
      }),
    })
    const response = await POST(req)

    expect(response.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("returns 409 when registering with duplicate email", async () => {
    mockFindUnique.mockResolvedValue({
      id: "existing-user",
      email: "existing@example.com",
      name: "Existing User",
    })

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Another User",
        email: "existing@example.com",
        password: "Password1",
      }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("El email ya esta registrado")
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("returns 400 with invalid data - short name", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "A",
        email: "test@example.com",
        password: "Password1",
      }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Datos invalidos")
    expect(body.details).toBeDefined()
  })

  it("returns 400 with invalid data - weak password", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "short",
      }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Datos invalidos")
  })

  it("returns 400 with invalid data - bad email", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "not-an-email",
        password: "Password1",
      }),
    })
    const response = await POST(req)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Datos invalidos")
  })
})
