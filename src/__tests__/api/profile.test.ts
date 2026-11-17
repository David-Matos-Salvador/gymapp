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
import { calculateProfileCompletion, getProfileCompletionFields } from "@/lib/profile-completion"

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

  // Issue #107: la barra «Perfil completado» contaba campos que no se podían editar.
  it("todos los campos que cuentan para la barra se pueden guardar", async () => {
    const datos = {
      name: "Ana",
      phone: "+51 999 123 456",
      sex: "FEMALE",
      birthDate: "1995-04-20",
      objective: "STRENGTH",
      experienceLevel: "INTERMEDIATE",
      emergencyContact: "  Rosa Pérez ",
      emergencyPhone: "+51 988 777 666",
    }
    expect(Object.keys(datos).sort()).toEqual(
      [...(getProfileCompletionFields("MEMBER") ?? [])].sort()
    )

    const response = await guardar(datos)

    expect(response.status).toBe(200)
    const guardado = mockUpdate.mock.calls[0][0].data
    expect(guardado).toEqual({
      ...datos,
      emergencyContact: "Rosa Pérez",
      birthDate: new Date("1995-04-20T00:00:00.000Z"),
    })
    expect(calculateProfileCompletion({ ...guardado, role: "MEMBER" })).toBe(100)
  })

  // Issue #153: al coach le cuenta la descripción («Sobre ti»), que antes no se podía editar.
  it("guarda la descripción del coach sin espacios sobrantes y la borra si llega vacía", async () => {
    await guardar({ bio: "  Fuerza y movilidad " })
    expect(mockUpdate.mock.calls[0][0].data.bio).toBe("Fuerza y movilidad")

    await guardar({ bio: " " })
    expect(mockUpdate.mock.calls[1][0].data.bio).toBeNull()

    const response = await guardar({ bio: "x".repeat(501) })
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe(
      "La descripción no puede tener más de 500 caracteres"
    )
  })

  it("lo que no se manda no se toca", async () => {
    await guardar({ name: "Ana", sex: "OTHER" })

    const guardado = mockUpdate.mock.calls[0][0].data
    expect(guardado.sex).toBe("OTHER")
    for (const campo of ["birthDate", "objective", "experienceLevel", "emergencyContact"]) {
      expect(guardado[campo], campo).toBeUndefined()
    }
  })

  it("fecha de nacimiento y contacto de emergencia vacíos se borran", async () => {
    const response = await guardar({ birthDate: "", emergencyContact: " ", emergencyPhone: "" })

    expect(response.status).toBe(200)
    const guardado = mockUpdate.mock.calls[0][0].data
    expect(guardado.birthDate).toBeNull()
    expect(guardado.emergencyContact).toBeNull()
    expect(guardado.emergencyPhone).toBeNull()
  })

  it.each([
    [{ sex: "X" }, "Elige un sexo de la lista"],
    [{ objective: "VOLAR" }, "Elige un objetivo de la lista"],
    [{ experienceLevel: "DIOS" }, "Elige un nivel de experiencia de la lista"],
    [{ birthDate: "2999-01-01" }, "Escribe una fecha de nacimiento válida"],
    [{ birthDate: "1990-02-31" }, "Escribe una fecha de nacimiento válida"],
    [{ birthDate: "ayer" }, "Escribe una fecha de nacimiento válida"],
    [
      { emergencyPhone: "abc" },
      "Escribe un teléfono de emergencia válido, por ejemplo +51 999 123 456",
    ],
    [
      { emergencyContact: "x".repeat(101) },
      "El contacto de emergencia no puede tener más de 100 caracteres",
    ],
  ])("rechaza %j con un mensaje claro", async (datos, mensaje) => {
    const response = await guardar(datos)

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe(mensaje)
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
