import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const userUpdate = vi.fn()
  const gymFindMany = vi.fn()

  return {
    userFindUnique,
    userUpdate,
    gymFindMany,
    prisma: {
      user: { findUnique: userFindUnique, update: userUpdate },
      gym: { findMany: gymFindMany },
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json", ...init?.headers },
      })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { GET as getCoachProfile, POST as updateCoachProfile } from "@/app/api/coach-profile/route"
import { GET as searchGyms } from "@/app/api/gyms/search/route"

const storedCoach = {
  id: "u-trainer",
  name: "Coach Ana",
  email: "u-trainer@gymapp.com",
  role: "TRAINER",
  gymId: "gym-1",
  bio: "Bio anterior",
  specialties: ["Fuerza"],
  certifications: ["NSCA"],
  yearsExperience: 4,
  image: null,
}

function loginAs(role: string, overrides: Partial<typeof storedCoach> = {}) {
  const user = { ...storedCoach, role, ...overrides }
  mockAuth.mockResolvedValue({ user: { email: user.email } })
  mocks.userFindUnique.mockResolvedValue(user)
  return user
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost:3000${url}`, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockReset()
  mocks.userFindUnique.mockReset().mockResolvedValue(null)
  mocks.userUpdate
    .mockReset()
    .mockImplementation(async (a: { where: { id: string }; data: object }) => ({
      ...storedCoach,
      ...a.data,
    }))
  mocks.gymFindMany.mockReset().mockResolvedValue([])
})

describe("GET /api/coach-profile", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await getCoachProfile()

    expect(response.status).toBe(401)
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await getCoachProfile()

    expect(response.status).toBe(404)
  })

  it("devuelve solo los campos públicos del perfil de la sesión, sin contraseña ni gimnasio", async () => {
    loginAs("TRAINER")

    const response = await getCoachProfile()

    expect(response.status).toBe(200)
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "u-trainer@gymapp.com" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        specialties: true,
        certifications: true,
        yearsExperience: true,
        image: true,
      },
    })
    expect((await response.json()).coachProfile).toMatchObject({ id: "u-trainer" })
  })
})

describe("POST /api/coach-profile", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await updateCoachProfile(
      jsonRequest("/api/coach-profile", "POST", { bio: "Hola" })
    )

    expect(response.status).toBe(401)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it("responde 404 si el usuario de la sesión ya no existe", async () => {
    mockAuth.mockResolvedValue({ user: { email: "borrado@gymapp.com" } })

    const response = await updateCoachProfile(
      jsonRequest("/api/coach-profile", "POST", { bio: "Hola" })
    )

    expect(response.status).toBe(404)
  })

  it.each(["MEMBER", "SUPER_ADMIN"])(
    "un %s no puede editar el perfil profesional",
    async (role) => {
      loginAs(role)

      const response = await updateCoachProfile(
        jsonRequest("/api/coach-profile", "POST", { bio: "Hola" })
      )

      expect(response.status).toBe(403)
      expect((await response.json()).error).toBe(
        "Solo entrenadores pueden actualizar su perfil profesional"
      )
      expect(mocks.userUpdate).not.toHaveBeenCalled()
    }
  )

  it("responde 400 con años de experiencia negativos o decimales", async () => {
    loginAs("TRAINER")

    for (const yearsExperience of [-1, 2.5]) {
      const response = await updateCoachProfile(
        jsonRequest("/api/coach-profile", "POST", { yearsExperience })
      )
      expect(response.status).toBe(400)
      expect((await response.json()).details).toHaveProperty("yearsExperience")
    }
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it("responde 400 si las especialidades no son una lista de textos", async () => {
    loginAs("TRAINER")

    const response = await updateCoachProfile(
      jsonRequest("/api/coach-profile", "POST", { specialties: "Fuerza", certifications: [1] })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.details).toHaveProperty("specialties")
    expect(data.details).toHaveProperty("certifications")
  })

  it("un coach actualiza su perfil y conserva lo que no manda", async () => {
    loginAs("TRAINER")

    const response = await updateCoachProfile(
      jsonRequest("/api/coach-profile", "POST", { bio: "Nueva bio", yearsExperience: 6 })
    )

    expect(response.status).toBe(200)
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u-trainer" },
        data: {
          bio: "Nueva bio",
          specialties: ["Fuerza"],
          certifications: ["NSCA"],
          yearsExperience: 6,
        },
      })
    )
    expect((await response.json()).coachProfile).toMatchObject({
      bio: "Nueva bio",
      yearsExperience: 6,
    })
  })

  it("solo edita el perfil de la sesión aunque el cuerpo traiga otro id o rol", async () => {
    loginAs("ADMIN", { id: "u-admin", email: "u-admin@gymapp.com" })

    const response = await updateCoachProfile(
      jsonRequest("/api/coach-profile", "POST", {
        id: "otro",
        role: "SUPER_ADMIN",
        specialties: ["Movilidad"],
      })
    )

    expect(response.status).toBe(200)
    const call = mocks.userUpdate.mock.calls[0][0] as { where: object; data: object }
    expect(call.where).toEqual({ id: "u-admin" })
    expect(call.data).not.toHaveProperty("role")
    expect(call.data).toMatchObject({ specialties: ["Movilidad"] })
  })

  it.todo(
    "no pone tope a los años de experiencia, al largo de la bio ni a la cantidad de especialidades o certificaciones"
  )
  it.todo(
    "con un cuerpo que no es JSON debería responder 400; hoy `request.json()` no está protegido y la ruta lanza un error (500 sin cuerpo JSON)"
  )
})

describe("GET /api/gyms/search", () => {
  it("responde 401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await searchGyms(jsonRequest("/api/gyms/search?q=fit", "GET"))

    expect(response.status).toBe(401)
    expect(mocks.gymFindMany).not.toHaveBeenCalled()
  })

  it.each(["", "a", "  b  "])(
    "con menos de 2 letras (%j) devuelve una lista vacía sin consultar la base",
    async (q) => {
      loginAs("MEMBER")

      const response = await searchGyms(
        jsonRequest(`/api/gyms/search?q=${encodeURIComponent(q)}`, "GET")
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ gyms: [] })
      expect(mocks.gymFindMany).not.toHaveBeenCalled()
    }
  )

  it("busca por nombre o slug sin distinguir mayúsculas, solo gimnasios activos y no el de por defecto", async () => {
    loginAs("MEMBER")
    mocks.gymFindMany.mockResolvedValue([
      { id: "gym-1", name: "Fit Center", slug: "fit-center", address: null },
    ])

    const response = await searchGyms(jsonRequest("/api/gyms/search?q=%20Fit%20", "GET"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      gyms: [{ id: "gym-1", name: "Fit Center", slug: "fit-center", address: null }],
    })
    expect(mocks.gymFindMany).toHaveBeenCalledWith({
      where: {
        active: true,
        isDefault: false,
        OR: [
          { name: { contains: "Fit", mode: "insensitive" } },
          { slug: { contains: "Fit", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, address: true },
      orderBy: { name: "asc" },
      take: 10,
    })
  })

  it("no expone el dueño, el correo ni el teléfono del gimnasio", async () => {
    loginAs("MEMBER")

    await searchGyms(jsonRequest("/api/gyms/search?q=fit", "GET"))

    const { select } = mocks.gymFindMany.mock.calls[0][0] as { select: Record<string, boolean> }
    expect(Object.keys(select).sort()).toEqual(["address", "id", "name", "slug"])
  })
})
