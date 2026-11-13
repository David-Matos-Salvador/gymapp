import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
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

import { POST } from "@/app/api/profile/route"

function guardar(body: unknown) {
  return POST(
    new Request("http://localhost/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

// Issue #111: borrar el teléfono no lo borraba y se aceptaba cualquier texto.
describe("POST /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { email: "ana@test.com" } })
    mockFindUnique.mockResolvedValue({ id: "user-1", name: "Ana", phone: "+51 999 123 456" })
    mockUpdate.mockImplementation(async ({ data }: { data: object }) => ({ id: "user-1", ...data }))
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await guardar({ name: "Ana" })

    expect(response.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("guarda el nombre y el teléfono sin espacios sobrantes", async () => {
    const response = await guardar({ name: "  Ana María ", phone: " +51 987 654 321 " })

    expect(response.status).toBe(200)
    expect(mockUpdate.mock.calls[0][0].data).toEqual({
      name: "Ana María",
      phone: "+51 987 654 321",
    })
  })

  it.each([[null], [""], ["   "]])("un teléfono vacío (%j) borra el teléfono", async (phone) => {
    const response = await guardar({ name: "Ana", phone })

    expect(response.status).toBe(200)
    expect(mockUpdate.mock.calls[0][0].data.phone).toBeNull()
  })

  it("si no se manda el teléfono, se conserva el que había", async () => {
    const response = await guardar({ name: "Ana Nueva" })

    expect(response.status).toBe(200)
    expect(mockUpdate.mock.calls[0][0].data).toEqual({
      name: "Ana Nueva",
      phone: "+51 999 123 456",
    })
  })

  it.each([["abc"], ["123"], ["+51 999 abc 456"], ["1234567890123456"], [51999123456]])(
    "rechaza el teléfono %j",
    async (phone) => {
      const response = await guardar({ name: "Ana", phone })
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe("Escribe un teléfono válido, por ejemplo +51 999 123 456")
      expect(mockUpdate).not.toHaveBeenCalled()
    }
  )

  it.each([[""], ["   "], ["x".repeat(101)]])("rechaza el nombre %j", async (name) => {
    const response = await guardar({ name })

    expect(response.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("un cuerpo que no es JSON no rompe la API", async () => {
    const response = await POST(
      new Request("http://localhost/api/profile", { method: "POST", body: "no es json" })
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("Datos inválidos")
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("un nombre que no es texto se rechaza con un mensaje en español", async () => {
    const response = await guardar({ name: 123 })

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe("El nombre no es válido")
  })
})
