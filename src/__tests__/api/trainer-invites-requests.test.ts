import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const userCreate = vi.fn()
  const inviteFindMany = vi.fn()
  const inviteFindUnique = vi.fn()
  const inviteCreate = vi.fn()
  const inviteUpdate = vi.fn()
  const requestFindMany = vi.fn()
  const getFreeSlots = vi.fn()
  const refreshCalendarCache = vi.fn()
  return {
    userFindUnique,
    userCreate,
    inviteFindMany,
    inviteFindUnique,
    inviteCreate,
    inviteUpdate,
    requestFindMany,
    getFreeSlots,
    refreshCalendarCache,
    prisma: {
      user: { findUnique: userFindUnique, create: userCreate },
      trainerInvite: {
        findMany: inviteFindMany,
        findUnique: inviteFindUnique,
        create: inviteCreate,
        update: inviteUpdate,
      },
      trainerRequest: { findMany: requestFindMany },
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/coach-schedule-db", () => ({ getFreeSlots: mocks.getFreeSlots }))
vi.mock("@/lib/calendar-sync", () => ({ refreshCalendarCacheIfStale: mocks.refreshCalendarCache }))
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hash-falso") } }))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { GET as listInvites, POST as createInvite } from "@/app/api/trainer/invites/route"
import { GET as getInvite, POST as completeInvite } from "@/app/api/trainer/invites/[token]/route"
import { GET as listTrainerRequests } from "@/app/api/trainer/requests/route"
import { GET as listMyTrainerRequests } from "@/app/api/user/trainer-requests/route"
import { GET as listSlots } from "@/app/api/appointments/slots/route"

const coach = {
  id: "coach-1",
  name: "Coach Luis",
  email: "luis@test.com",
  role: "TRAINER",
  gymId: "gym-1",
}
const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@test.com",
  role: "ADMIN",
  gymId: "gym-1",
}
const member = {
  id: "member-1",
  name: "Ana",
  email: "ana@test.com",
  role: "MEMBER",
  gymId: "gym-1",
  assignedTrainerId: "coach-1",
}

const FUTURE = new Date(Date.now() + 3 * 86400000)
const PAST = new Date(Date.now() - 86400000)

const pendingInvite = {
  id: "invite-1",
  token: "tok123",
  trainerId: "coach-1",
  gymId: "gym-1",
  name: "Invitada",
  email: "invitada@test.com",
  phone: "999888777",
  status: "PENDING",
  expiresAt: FUTURE,
  trainer: { name: "Coach Luis" },
  gym: { name: "Gym Centro" },
}

function sessionAs(user: { email: string } | null) {
  mockAuth.mockResolvedValue(user ? { user: { email: user.email } } : null)
}

/** El usuario de la sesión se busca por correo; cualquier otra búsqueda por correo devuelve `others`. */
function usersByEmail(sessionUser: unknown, others: Record<string, unknown> = {}) {
  mocks.userFindUnique.mockImplementation(
    async ({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email && where.email in others) return others[where.email]
      if (where.email)
        return (sessionUser as { email?: string } | null)?.email === where.email
          ? sessionUser
          : null
      return null
    }
  )
}

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost:3000${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const tokenParams = (token = "tok123") => ({ params: Promise.resolve({ token }) })

const validSignup = {
  name: "Invitada Nueva",
  email: "invitada@test.com",
  password: "Clave1234",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("AUTH_URL", "https://gym.example.com")
  sessionAs(coach)
  usersByEmail(coach)
  mocks.inviteFindMany.mockResolvedValue([{ id: "invite-1" }])
  mocks.inviteCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "invite-1",
    ...data,
  }))
  mocks.inviteFindUnique.mockResolvedValue({ ...pendingInvite })
  mocks.inviteUpdate.mockResolvedValue({})
  mocks.userCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "nuevo-1",
    ...data,
  }))
  mocks.requestFindMany.mockResolvedValue([{ id: "req-1" }])
  mocks.getFreeSlots.mockResolvedValue({
    timeZone: "America/Lima",
    hasAvailability: true,
    slots: [],
  })
  mocks.refreshCalendarCache.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /api/trainer/invites", () => {
  it("401 sin sesión", async () => {
    sessionAs(null)
    const res = await listInvites()
    expect(res.status).toBe(401)
  })

  it("403 para un miembro", async () => {
    sessionAs(member)
    usersByEmail(member)
    const res = await listInvites()
    expect(res.status).toBe(403)
    expect(mocks.inviteFindMany).not.toHaveBeenCalled()
  })

  it("403 si el usuario de la sesión no existe", async () => {
    usersByEmail(null)
    const res = await listInvites()
    expect(res.status).toBe(403)
  })

  it("el coach solo ve sus propias invitaciones", async () => {
    const res = await listInvites()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ invites: [{ id: "invite-1" }] })
    expect(mocks.inviteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trainerId: "coach-1" }, take: 30 })
    )
  })

  it("el admin también puede listar las suyas", async () => {
    sessionAs(admin)
    usersByEmail(admin)
    const res = await listInvites()
    expect(res.status).toBe(200)
    expect(mocks.inviteFindMany.mock.calls[0][0].where).toEqual({ trainerId: "admin-1" })
  })
})

describe("POST /api/trainer/invites", () => {
  it("401 sin sesión", async () => {
    sessionAs(null)
    const res = await createInvite(jsonRequest("/api/trainer/invites", "POST", {}))
    expect(res.status).toBe(401)
  })

  it("403 para un miembro", async () => {
    sessionAs(member)
    usersByEmail(member)
    const res = await createInvite(jsonRequest("/api/trainer/invites", "POST", {}))
    expect(res.status).toBe(403)
    expect(mocks.inviteCreate).not.toHaveBeenCalled()
  })

  it("400 con correo inválido", async () => {
    const res = await createInvite(
      jsonRequest("/api/trainer/invites", "POST", { email: "no-es-correo" })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Datos inválidos")
    expect(body.details.email).toContain("Correo inválido")
  })

  it("400 con nombre de una letra", async () => {
    const res = await createInvite(jsonRequest("/api/trainer/invites", "POST", { name: "A" }))
    expect(res.status).toBe(400)
  })

  it("409 si ya existe un usuario con ese correo", async () => {
    usersByEmail(coach, { "ana@test.com": member })
    const res = await createInvite(
      jsonRequest("/api/trainer/invites", "POST", { email: "ana@test.com" })
    )
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "Ya existe un usuario con ese correo" })
    expect(mocks.inviteCreate).not.toHaveBeenCalled()
  })

  it("crea la invitación del coach en su gimnasio, con 7 días de vigencia y enlace público", async () => {
    const res = await createInvite(
      jsonRequest("/api/trainer/invites", "POST", { name: "  Invitada ", phone: "999888777" })
    )
    expect(res.status).toBe(201)
    const body = await res.json()

    const data = mocks.inviteCreate.mock.calls[0][0].data
    expect(data).toMatchObject({
      trainerId: "coach-1",
      gymId: "gym-1",
      name: "Invitada",
      email: null,
      phone: "999888777",
    })
    expect(data.token).toMatch(/^[0-9a-f]{48}$/)
    const days = (data.expiresAt.getTime() - Date.now()) / 86400000
    expect(Math.round(days)).toBe(7)
    expect(body.url).toBe(`https://gym.example.com/invite/${data.token}`)
  })

  it("acepta una invitación sin datos (enlace genérico)", async () => {
    const res = await createInvite(
      new Request("http://localhost:3000/api/trainer/invites", { method: "POST" })
    )
    expect(res.status).toBe(201)
  })
})

describe("GET /api/trainer/invites/[token]", () => {
  it("404 si el token no existe", async () => {
    mocks.inviteFindUnique.mockResolvedValue(null)
    const res = await getInvite(jsonRequest("/api/trainer/invites/x", "GET"), tokenParams("x"))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Invitación no encontrada" })
  })

  it("410 si ya fue usada", async () => {
    mocks.inviteFindUnique.mockResolvedValue({ ...pendingInvite, status: "COMPLETED" })
    const res = await getInvite(jsonRequest("/api/trainer/invites/tok123", "GET"), tokenParams())
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: "Esta invitación ya fue usada" })
  })

  it("410 y la marca EXPIRED si venció estando pendiente", async () => {
    mocks.inviteFindUnique.mockResolvedValue({ ...pendingInvite, expiresAt: PAST })
    const res = await getInvite(jsonRequest("/api/trainer/invites/tok123", "GET"), tokenParams())
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: "Esta invitación ha expirado" })
    expect(mocks.inviteUpdate).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { status: "EXPIRED" },
    })
  })

  it("410 sin volver a escribir si ya estaba EXPIRED", async () => {
    mocks.inviteFindUnique.mockResolvedValue({ ...pendingInvite, status: "EXPIRED" })
    const res = await getInvite(jsonRequest("/api/trainer/invites/tok123", "GET"), tokenParams())
    expect(res.status).toBe(410)
    expect(mocks.inviteUpdate).not.toHaveBeenCalled()
  })

  it("devuelve solo los datos públicos de la invitación vigente", async () => {
    const res = await getInvite(jsonRequest("/api/trainer/invites/tok123", "GET"), tokenParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      invite: {
        trainerName: "Coach Luis",
        gymName: "Gym Centro",
        name: "Invitada",
        email: "invitada@test.com",
        phone: "999888777",
        expiresAt: FUTURE.toISOString(),
      },
    })
  })
})

describe("POST /api/trainer/invites/[token]", () => {
  it("404 si el token no existe", async () => {
    mocks.inviteFindUnique.mockResolvedValue(null)
    const res = await completeInvite(
      jsonRequest("/api/trainer/invites/x", "POST", validSignup),
      tokenParams("x")
    )
    expect(res.status).toBe(404)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it("410 si ya fue usada, sin crear otra cuenta", async () => {
    mocks.inviteFindUnique.mockResolvedValue({ ...pendingInvite, status: "COMPLETED" })
    const res = await completeInvite(
      jsonRequest("/api/trainer/invites/tok123", "POST", validSignup),
      tokenParams()
    )
    expect(res.status).toBe(410)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it("410 si venció, sin crear cuenta", async () => {
    mocks.inviteFindUnique.mockResolvedValue({ ...pendingInvite, expiresAt: PAST })
    const res = await completeInvite(
      jsonRequest("/api/trainer/invites/tok123", "POST", validSignup),
      tokenParams()
    )
    expect(res.status).toBe(410)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it("400 con contraseña débil, con mensajes en español", async () => {
    const res = await completeInvite(
      jsonRequest("/api/trainer/invites/tok123", "POST", { ...validSignup, password: "corta" }),
      tokenParams()
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.details.password).toEqual(
      expect.arrayContaining([
        "Mínimo 8 caracteres",
        "Debe contener una mayúscula",
        "Debe contener un número",
      ])
    )
  })

  it("400 con correo inválido o sin nombre", async () => {
    const res = await completeInvite(
      jsonRequest("/api/trainer/invites/tok123", "POST", { password: "Clave1234", email: "x" }),
      tokenParams()
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.details.email).toContain("Correo inválido")
    expect(body.details.name).toBeDefined()
  })

  it("409 si el correo ya está registrado", async () => {
    usersByEmail(null, { "invitada@test.com": { id: "otro" } })
    const res = await completeInvite(
      jsonRequest("/api/trainer/invites/tok123", "POST", validSignup),
      tokenParams()
    )
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: "El correo ya está registrado" })
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it("crea un MIEMBRO asignado al coach y al gimnasio de la invitación y la marca usada", async () => {
    const res = await completeInvite(
      jsonRequest("/api/trainer/invites/tok123", "POST", { ...validSignup, role: "ADMIN" }),
      tokenParams()
    )
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({
      message: "Cuenta creada",
      user: { id: "nuevo-1", email: "invitada@test.com", name: "Invitada Nueva" },
    })

    const data = mocks.userCreate.mock.calls[0][0].data
    expect(data).toMatchObject({
      role: "MEMBER",
      assignedTrainerId: "coach-1",
      gymId: "gym-1",
      password: "hash-falso",
      phone: "999888777",
    })

    expect(mocks.inviteUpdate).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: expect.objectContaining({ status: "COMPLETED", usedByUserId: "nuevo-1" }),
    })
  })

  it("el teléfono escrito al registrarse reemplaza al de la invitación", async () => {
    await completeInvite(
      jsonRequest("/api/trainer/invites/tok123", "POST", { ...validSignup, phone: " 911222333 " }),
      tokenParams()
    )
    expect(mocks.userCreate.mock.calls[0][0].data.phone).toBe("911222333")
  })

  it.todo(
    "si la invitación trae un correo, no se exige que la cuenta se cree con ese correo: cualquiera con el enlace puede registrarse con otro"
  )
  it.todo(
    "crear la cuenta y marcar la invitación no van en una transacción ni con updateMany condicionado a PENDING: dos envíos simultáneos con el mismo enlace crean dos cuentas"
  )
})

describe("GET /api/trainer/requests", () => {
  it("401 sin sesión", async () => {
    sessionAs(null)
    const res = await listTrainerRequests(jsonRequest("/api/trainer/requests", "GET"))
    expect(res.status).toBe(401)
  })

  it("403 para un miembro", async () => {
    sessionAs(member)
    usersByEmail(member)
    const res = await listTrainerRequests(jsonRequest("/api/trainer/requests", "GET"))
    expect(res.status).toBe(403)
    expect(mocks.requestFindMany).not.toHaveBeenCalled()
  })

  it("el coach solo ve las solicitudes dirigidas a él", async () => {
    const res = await listTrainerRequests(jsonRequest("/api/trainer/requests", "GET"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ requests: [{ id: "req-1" }] })
    expect(mocks.requestFindMany.mock.calls[0][0].where).toEqual({ trainerId: "coach-1" })
  })

  it("filtra por estado válido", async () => {
    await listTrainerRequests(jsonRequest("/api/trainer/requests?status=PENDING", "GET"))
    expect(mocks.requestFindMany.mock.calls[0][0].where).toEqual({
      trainerId: "coach-1",
      status: "PENDING",
    })
  })

  it("ignora un estado inválido en vez de pasarlo a la base", async () => {
    await listTrainerRequests(jsonRequest("/api/trainer/requests?status=CUALQUIERA", "GET"))
    expect(mocks.requestFindMany.mock.calls[0][0].where).toEqual({ trainerId: "coach-1" })
  })

  it("no expone datos del cliente más allá de id, nombre y correo", async () => {
    await listTrainerRequests(jsonRequest("/api/trainer/requests", "GET"))
    expect(mocks.requestFindMany.mock.calls[0][0].include).toEqual({
      client: { select: { id: true, name: true, email: true } },
    })
  })
})

describe("GET /api/user/trainer-requests", () => {
  it("401 sin sesión", async () => {
    sessionAs(null)
    const res = await listMyTrainerRequests()
    expect(res.status).toBe(401)
  })

  it("404 si el usuario no existe", async () => {
    sessionAs(member)
    usersByEmail(null)
    const res = await listMyTrainerRequests()
    expect(res.status).toBe(404)
  })

  it("el miembro solo ve sus propias solicitudes, sin datos sensibles del coach", async () => {
    sessionAs(member)
    usersByEmail(member)
    const res = await listMyTrainerRequests()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ requests: [{ id: "req-1" }] })
    const args = mocks.requestFindMany.mock.calls[0][0]
    expect(args.where).toEqual({ clientId: "member-1" })
    expect(Object.keys(args.include.trainer.select)).not.toContain("password")
    expect(Object.keys(args.include.trainer.select)).not.toContain("phone")
  })
})

describe("GET /api/appointments/slots", () => {
  /** Por correo: el usuario de la sesión. Por id: el coach asignado. */
  function slotUsers(sessionUser: unknown, assignedCoach: unknown = coach) {
    mocks.userFindUnique.mockImplementation(async ({ where }: { where: { email?: string } }) =>
      where.email ? sessionUser : assignedCoach
    )
  }

  beforeEach(() => {
    sessionAs(member)
    slotUsers(member)
  })

  it("401 sin sesión", async () => {
    sessionAs(null)
    const res = await listSlots()
    expect(res.status).toBe(401)
    expect(mocks.getFreeSlots).not.toHaveBeenCalled()
  })

  it("404 si el usuario no existe", async () => {
    slotUsers(null)
    const res = await listSlots()
    expect(res.status).toBe(404)
  })

  it("403 si el cliente no tiene coach asignado", async () => {
    slotUsers({ ...member, assignedTrainerId: null })
    const res = await listSlots()
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Todavía no tienes un coach asignado" })
    expect(mocks.getFreeSlots).not.toHaveBeenCalled()
  })

  it("403 si el coach asignado es de otro gimnasio", async () => {
    slotUsers(member, { ...coach, gymId: "gym-2" })
    const res = await listSlots()
    expect(res.status).toBe(403)
    expect(mocks.getFreeSlots).not.toHaveBeenCalled()
  })

  it("403 si el «coach» asignado ya no tiene rol de coach", async () => {
    slotUsers(member, { ...coach, role: "MEMBER" })
    const res = await listSlots()
    expect(res.status).toBe(403)
  })

  it("devuelve las horas libres del coach asignado tras refrescar su calendario", async () => {
    mocks.getFreeSlots.mockResolvedValue({
      timeZone: "America/Lima",
      hasAvailability: true,
      slots: [{ startsAt: "2026-11-20T14:00:00.000Z", date: "2026-11-20", time: "09:00" }],
    })
    const res = await listSlots()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      coach: { id: "coach-1", name: "Coach Luis" },
      timeZone: "America/Lima",
      hasAvailability: true,
      slots: [{ startsAt: "2026-11-20T14:00:00.000Z", date: "2026-11-20", time: "09:00" }],
    })
    expect(mocks.refreshCalendarCache).toHaveBeenCalledWith("coach-1")
    expect(mocks.getFreeSlots).toHaveBeenCalledWith(mocks.prisma, {
      id: "coach-1",
      name: "Coach Luis",
      gymId: "gym-1",
    })
  })
})
