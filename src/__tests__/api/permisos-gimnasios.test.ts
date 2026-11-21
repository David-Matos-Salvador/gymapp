import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const userFindMany = vi.fn()
  const userCreate = vi.fn()
  const userUpdate = vi.fn()
  const userCount = vi.fn()
  const gymFindUnique = vi.fn()
  const gymFindMany = vi.fn()
  const gymUpdate = vi.fn()
  const gymCount = vi.fn()
  const membershipCount = vi.fn()
  const paymentAggregate = vi.fn()
  const checkInCount = vi.fn()
  const notificationCreate = vi.fn()
  const tx = {
    user: { create: vi.fn() },
    gym: { create: vi.fn(), update: vi.fn() },
    exercise: { findMany: vi.fn() },
    gymExercise: { createMany: vi.fn() },
    gymEquipment: { findMany: vi.fn() },
    gymEquipmentActivation: { createMany: vi.fn() },
  }
  const transaction = vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx))
  return {
    userFindUnique,
    userFindMany,
    userCreate,
    userUpdate,
    userCount,
    gymFindUnique,
    gymFindMany,
    gymUpdate,
    gymCount,
    membershipCount,
    paymentAggregate,
    checkInCount,
    notificationCreate,
    tx,
    transaction,
    emitRealtime: vi.fn(),
    sendPush: vi.fn(),
    sendMembershipReminder: vi.fn(),
    getTrainerClientIds: vi.fn(),
    prisma: {
      user: {
        findUnique: userFindUnique,
        findMany: userFindMany,
        create: userCreate,
        update: userUpdate,
        count: userCount,
      },
      gym: {
        findUnique: gymFindUnique,
        findMany: gymFindMany,
        update: gymUpdate,
        count: gymCount,
      },
      membership: { count: membershipCount },
      payment: { aggregate: paymentAggregate },
      checkIn: { count: checkInCount },
      notification: { create: notificationCreate },
      $transaction: transaction,
    },
  }
})

const mockAuth = vi.fn()

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/realtime", () => ({ emitRealtime: mocks.emitRealtime }))
vi.mock("@/lib/push-notifications", () => ({ sendPush: mocks.sendPush }))
vi.mock("@/lib/email", () => ({ sendMembershipReminder: mocks.sendMembershipReminder }))
vi.mock("@/lib/trainer-client", () => ({ getTrainerClientIds: mocks.getTrainerClientIds }))
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

import { POST as createStaff } from "@/app/api/admin/users/route"
import { GET as getPlatform } from "@/app/api/admin/platform/route"
import { GET as listGyms, POST as createGym } from "@/app/api/gyms/route"
import { GET as getGym, PATCH as updateGym } from "@/app/api/gyms/[id]/route"
import { POST as joinGym } from "@/app/api/user/gym/route"
import { GET as searchMembers } from "@/app/api/members/search/route"
import { POST as createMember } from "@/app/api/trainer/members/route"
import { POST as sendNotification } from "@/app/api/notifications/send/route"

const superAdmin = { id: "super-1", email: "super@test.com", role: "SUPER_ADMIN", gymId: null }
const admin = { id: "admin-1", email: "admin@test.com", role: "ADMIN", gymId: "gym-1" }
const otherAdmin = { id: "admin-2", email: "admin2@test.com", role: "ADMIN", gymId: "gym-2" }
const coach = { id: "coach-1", email: "coach@test.com", role: "TRAINER", gymId: "gym-1" }
const member = {
  id: "member-1",
  name: "Ana",
  email: "ana@test.com",
  role: "MEMBER",
  gymId: "gym-1",
}
const gymlessMember = { ...member, id: "member-9", email: "sin-gym@test.com", gymId: null }
const otherGymMember = {
  id: "member-2",
  name: "Beto",
  email: "beto@test.com",
  role: "MEMBER",
  gymId: "gym-2",
}

const gym1 = {
  id: "gym-1",
  name: "Gym Centro",
  slug: "gym-centro",
  active: true,
  isDefault: false,
  ownerId: "admin-1",
}
const gym2 = { ...gym1, id: "gym-2", name: "Gym Norte", slug: "gym-norte", ownerId: "admin-2" }

function sessionAs(user: { email: string } | null) {
  mockAuth.mockResolvedValue(user ? { user: { email: user.email } } : null)
}

/** Busca usuarios por correo o id entre los que se pasen. */
function usersInDb(...users: Array<{ id: string; email: string }>) {
  mocks.userFindUnique.mockImplementation(
    async ({ where }: { where: { email?: string; id?: string } }) =>
      users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null
  )
}

function gymsInDb(...gyms: Array<{ id: string } & Record<string, unknown>>) {
  mocks.gymFindUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) => gyms.find((g) => g.id === where.id) ?? null
  )
}

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation(async (fn: (client: typeof mocks.tx) => unknown) =>
    fn(mocks.tx)
  )
})

// ---------------------------------------------------------------------------
// POST /api/admin/users
// ---------------------------------------------------------------------------

describe("POST /api/admin/users", () => {
  const validStaff = {
    name: "Nueva Admin",
    email: "nueva@test.com",
    password: "Segura123",
    role: "ADMIN",
    gymId: "gym-2",
  }

  beforeEach(() => {
    mocks.tx.user.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "nuevo-1",
        name: data.name,
        email: data.email,
        role: data.role,
        gymId: data.gymId,
      })
    )
  })

  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(res.status).toBe(401)
  })

  it.each([
    ["ADMIN", admin],
    ["TRAINER", coach],
    ["MEMBER", member],
  ])("responde 403 si quien crea es %s", async (_role, actor) => {
    sessionAs(actor)
    usersInDb(actor)
    const res = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(res.status).toBe(403)
    expect(mocks.tx.user.create).not.toHaveBeenCalled()
  })

  it("un admin no puede crear otro admin en otro gimnasio", async () => {
    sessionAs(admin)
    usersInDb(admin)
    const res = await createStaff(
      jsonRequest("/api/admin/users", { ...validStaff, gymId: "gym-2" })
    )
    expect(res.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 400 con contraseña débil o rol no permitido", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    const weak = await createStaff(
      jsonRequest("/api/admin/users", { ...validStaff, password: "debil" })
    )
    expect(weak.status).toBe(400)
    const asSuper = await createStaff(
      jsonRequest("/api/admin/users", { ...validStaff, role: "SUPER_ADMIN" })
    )
    expect(asSuper.status).toBe(400)
  })

  it("responde 409 si el correo ya existe", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin, { id: "x", email: validStaff.email })
    const res = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(res.status).toBe(409)
  })

  it("responde 400 si el gimnasio no existe o está inactivo", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    gymsInDb()
    const missing = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(missing.status).toBe(400)

    gymsInDb({ ...gym2, active: false })
    const inactive = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(inactive.status).toBe(400)
    expect(mocks.tx.user.create).not.toHaveBeenCalled()
  })

  it("el superadmin crea un admin en el gimnasio indicado y lo hace dueño si no tiene", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    gymsInDb({ ...gym2, ownerId: null })
    const res = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.user).toMatchObject({ email: validStaff.email, role: "ADMIN", gymId: "gym-2" })
    expect(body.user).not.toHaveProperty("password")
    expect(mocks.tx.gym.update).toHaveBeenCalledWith({
      where: { id: "gym-2" },
      data: { ownerId: "nuevo-1" },
    })
  })

  it("no cambia el dueño si el gimnasio ya tiene uno", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    gymsInDb(gym2)
    const res = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(res.status).toBe(201)
    expect(mocks.tx.gym.update).not.toHaveBeenCalled()
  })

  it("crear un coach no toca el dueño del gimnasio", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    gymsInDb({ ...gym2, ownerId: null })
    const res = await createStaff(
      jsonRequest("/api/admin/users", { ...validStaff, role: "TRAINER" })
    )
    expect(res.status).toBe(201)
    expect(mocks.tx.gym.update).not.toHaveBeenCalled()
  })

  it("responde 409 si la base rechaza por duplicado (P2002)", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    gymsInDb({ ...gym2, ownerId: null })
    mocks.transaction.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }))
    const res = await createStaff(jsonRequest("/api/admin/users", validStaff))
    expect(res.status).toBe(409)
  })

  it.todo(
    "con un cuerpo que no es JSON debería responder 400; hoy `request.json()` está fuera del try y la ruta lanza un error (500)"
  )
})

// ---------------------------------------------------------------------------
// GET /api/admin/platform
// ---------------------------------------------------------------------------

describe("GET /api/admin/platform", () => {
  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await getPlatform()
    expect(res.status).toBe(401)
  })

  it.each([
    ["ADMIN", admin],
    ["TRAINER", coach],
    ["MEMBER", member],
  ])("responde 403 a %s y no consulta datos de la plataforma", async (_role, actor) => {
    sessionAs(actor)
    usersInDb(actor)
    const res = await getPlatform()
    expect(res.status).toBe(403)
    expect(mocks.gymFindMany).not.toHaveBeenCalled()
    expect(mocks.paymentAggregate).not.toHaveBeenCalled()
  })

  it("responde 403 si el usuario de la sesión ya no existe", async () => {
    sessionAs(superAdmin)
    usersInDb()
    const res = await getPlatform()
    expect(res.status).toBe(403)
  })

  it("el superadmin ve totales y gimnasios de toda la plataforma", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    mocks.gymCount.mockResolvedValue(2)
    mocks.userCount.mockResolvedValue(5)
    mocks.membershipCount.mockResolvedValue(3)
    mocks.paymentAggregate.mockResolvedValue({ _sum: { amount: null } })
    mocks.checkInCount.mockResolvedValue(1)
    const createdAt = new Date("2026-11-01T00:00:00Z")
    mocks.gymFindMany.mockResolvedValue([
      { ...gym1, createdAt, _count: { users: 4 } },
      { ...gym2, createdAt, _count: { users: 1 } },
    ])
    mocks.userFindMany.mockResolvedValue([{ ...member, createdAt }])

    const res = await getPlatform()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats).toMatchObject({ totalGyms: 2, totalRevenue: 0, todayCheckins: 1 })
    expect(body.gyms.map((g: { id: string }) => g.id)).toEqual(["gym-1", "gym-2"])
    expect(body.gyms[0]).toMatchObject({ userCount: 4, createdAt: createdAt.toISOString() })
    expect(body.recentUsers[0].createdAt).toBe(createdAt.toISOString())
    // Los usuarios recientes no exponen la contraseña.
    expect(mocks.userFindMany.mock.calls[0][0].select).not.toHaveProperty("password")
  })
})

// ---------------------------------------------------------------------------
// GET y POST /api/gyms
// ---------------------------------------------------------------------------

describe("GET /api/gyms", () => {
  it("lista solo gimnasios activos y no el gimnasio por defecto, sin datos de contacto", async () => {
    mocks.gymFindMany.mockResolvedValue([{ id: "gym-1", name: "Gym Centro" }])
    const res = await listGyms()
    expect(res.status).toBe(200)
    const query = mocks.gymFindMany.mock.calls[0][0]
    expect(query.where).toEqual({ active: true, isDefault: false })
    expect(query.select).not.toHaveProperty("ownerId")
    expect(query.select).not.toHaveProperty("email")
    expect(query.select).not.toHaveProperty("phone")
  })
})

describe("POST /api/gyms", () => {
  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await createGym(jsonRequest("/api/gyms", { name: "Nuevo" }))
    expect(res.status).toBe(401)
  })

  it.each([
    ["ADMIN", admin],
    ["TRAINER", coach],
    ["MEMBER", member],
  ])("responde 403 si quien crea es %s", async (_role, actor) => {
    sessionAs(actor)
    usersInDb(actor)
    const res = await createGym(jsonRequest("/api/gyms", { name: "Nuevo" }))
    expect(res.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("responde 400 sin nombre, con correo inválido o con un nombre sin letras ni números", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    expect((await createGym(jsonRequest("/api/gyms", {}))).status).toBe(400)
    expect((await createGym(jsonRequest("/api/gyms", { name: "A", email: "x" }))).status).toBe(400)
    expect((await createGym(jsonRequest("/api/gyms", { name: "¡¡¡" }))).status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("el superadmin crea el gimnasio sin dueño y le activa ejercicios y equipos del sistema", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    mocks.tx.gym.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "gym-3",
      ...data,
    }))
    mocks.tx.exercise.findMany.mockResolvedValue([{ id: "ex-1" }, { id: "ex-2" }])
    mocks.tx.gymEquipment.findMany.mockResolvedValue([{ id: "eq-1" }])

    const res = await createGym(jsonRequest("/api/gyms", { name: "Gym Sur Lima" }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.gym).toMatchObject({ slug: "gym-sur-lima", ownerId: null })
    expect(body.provisionedExercises).toBe(2)
    expect(body.provisionedEquipment).toBe(1)
    expect(mocks.tx.gymExercise.createMany.mock.calls[0][0].data).toEqual([
      { gymId: "gym-3", exerciseId: "ex-1", active: true },
      { gymId: "gym-3", exerciseId: "ex-2", active: true },
    ])
    expect(mocks.tx.gymEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isSystem: true } })
    )
  })

  it("responde 409 si ya existe un gimnasio con ese slug", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    mocks.transaction.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "P2002" }))
    const res = await createGym(jsonRequest("/api/gyms", { name: "Gym Centro" }))
    expect(res.status).toBe(409)
  })
})

// ---------------------------------------------------------------------------
// GET y PATCH /api/gyms/[id]
// ---------------------------------------------------------------------------

describe("GET /api/gyms/[id]", () => {
  it("responde 404 si el gimnasio no existe", async () => {
    gymsInDb()
    const res = await getGym(new Request("http://localhost/api/gyms/nada"), params("nada"))
    expect(res.status).toBe(404)
  })

  it("sin sesión devuelve solo los datos públicos de un gimnasio activo", async () => {
    sessionAs(null)
    gymsInDb(gym1)
    const res = await getGym(new Request("http://localhost/api/gyms/gym-1"), params("gym-1"))
    expect(res.status).toBe(200)
    expect((await res.json()).gym.id).toBe("gym-1")
    expect(mocks.gymFindUnique).toHaveBeenCalledWith({
      where: { id: "gym-1", active: true, isDefault: false },
      select: expect.not.objectContaining({ ownerId: true }),
    })
  })

  it("un admin de otro gimnasio también recibe solo los datos públicos", async () => {
    sessionAs(otherAdmin)
    usersInDb(otherAdmin)
    gymsInDb(gym1)
    await getGym(new Request("http://localhost/api/gyms/gym-1"), params("gym-1"))
    expect(mocks.gymFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.any(Object) })
    )
  })

  it("el admin del gimnasio recibe el registro completo", async () => {
    sessionAs(admin)
    usersInDb(admin)
    gymsInDb(gym1)
    const res = await getGym(new Request("http://localhost/api/gyms/gym-1"), params("gym-1"))
    expect(res.status).toBe(200)
    expect(mocks.gymFindUnique).toHaveBeenCalledWith({ where: { id: "gym-1" } })
  })
})

describe("PATCH /api/gyms/[id]", () => {
  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await updateGym(
      jsonRequest("/api/gyms/gym-1", { phone: "1" }, "PATCH"),
      params("gym-1")
    )
    expect(res.status).toBe(401)
  })

  it("responde 404 si el gimnasio no existe", async () => {
    sessionAs(admin)
    usersInDb(admin)
    gymsInDb()
    const res = await updateGym(
      jsonRequest("/api/gyms/nada", { phone: "1" }, "PATCH"),
      params("nada")
    )
    expect(res.status).toBe(404)
  })

  it("un admin no puede editar otro gimnasio", async () => {
    sessionAs(admin)
    usersInDb(admin)
    gymsInDb(gym1, gym2)
    const res = await updateGym(
      jsonRequest("/api/gyms/gym-2", { phone: "999" }, "PATCH"),
      params("gym-2")
    )
    expect(res.status).toBe(403)
    expect(mocks.gymUpdate).not.toHaveBeenCalled()
  })

  it("un admin no puede cambiar el nombre ni activar o desactivar su propio gimnasio", async () => {
    sessionAs(admin)
    usersInDb(admin)
    gymsInDb(gym1)
    const rename = await updateGym(
      jsonRequest("/api/gyms/gym-1", { name: "Otro" }, "PATCH"),
      params("gym-1")
    )
    expect(rename.status).toBe(403)
    expect((await rename.json()).details.forbidden).toEqual(["name"])
    const deactivate = await updateGym(
      jsonRequest("/api/gyms/gym-1", { active: false }, "PATCH"),
      params("gym-1")
    )
    expect(deactivate.status).toBe(403)
    expect(mocks.gymUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ["TRAINER", coach],
    ["MEMBER", member],
  ])("%s de ese gimnasio no puede editar ningún campo", async (_role, actor) => {
    sessionAs(actor)
    usersInDb(actor)
    gymsInDb(gym1)
    const res = await updateGym(
      jsonRequest("/api/gyms/gym-1", { phone: "999" }, "PATCH"),
      params("gym-1")
    )
    expect(res.status).toBe(403)
    expect(mocks.gymUpdate).not.toHaveBeenCalled()
  })

  it("responde 400 con datos inválidos o sin cambios", async () => {
    sessionAs(admin)
    usersInDb(admin)
    gymsInDb(gym1)
    const invalid = await updateGym(
      jsonRequest("/api/gyms/gym-1", { email: "no-es-correo" }, "PATCH"),
      params("gym-1")
    )
    expect(invalid.status).toBe(400)
    const empty = await updateGym(jsonRequest("/api/gyms/gym-1", {}, "PATCH"), params("gym-1"))
    expect(empty.status).toBe(400)
  })

  it("un admin edita los datos de contacto de su gimnasio", async () => {
    sessionAs(admin)
    usersInDb(admin)
    gymsInDb(gym1)
    mocks.gymUpdate.mockResolvedValue({ ...gym1, phone: "999" })
    const res = await updateGym(
      jsonRequest("/api/gyms/gym-1", { phone: "999", showMachineNumbers: true }, "PATCH"),
      params("gym-1")
    )
    expect(res.status).toBe(200)
    expect(mocks.gymUpdate).toHaveBeenCalledWith({
      where: { id: "gym-1" },
      data: { phone: "999", showMachineNumbers: true },
    })
  })

  it("el superadmin cambia el nombre de cualquier gimnasio y se recalcula el slug", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    gymsInDb(gym2)
    mocks.gymUpdate.mockResolvedValue(gym2)
    const res = await updateGym(
      jsonRequest("/api/gyms/gym-2", { name: "Gym Norte Dos" }, "PATCH"),
      params("gym-2")
    )
    expect(res.status).toBe(200)
    expect(mocks.gymUpdate).toHaveBeenCalledWith({
      where: { id: "gym-2" },
      data: { name: "Gym Norte Dos", slug: "gym-norte-dos" },
    })
  })

  it.todo(
    "PATCH /api/gyms/[id] acepta un nombre sin letras ni números (p. ej. «¡¡¡») y guarda un slug vacío; POST /api/gyms sí lo rechaza con 400"
  )
})

// ---------------------------------------------------------------------------
// POST /api/user/gym
// ---------------------------------------------------------------------------

describe("POST /api/user/gym", () => {
  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await joinGym(jsonRequest("/api/user/gym", { gymId: "gym-1" }))
    expect(res.status).toBe(401)
  })

  it("responde 404 si el usuario de la sesión no existe", async () => {
    sessionAs(member)
    usersInDb()
    const res = await joinGym(jsonRequest("/api/user/gym", { gymId: "gym-1" }))
    expect(res.status).toBe(404)
  })

  it.each([
    ["ADMIN", admin],
    ["TRAINER", coach],
    ["SUPER_ADMIN", superAdmin],
  ])("responde 403 si quien se vincula es %s", async (_role, actor) => {
    sessionAs(actor)
    usersInDb(actor)
    const res = await joinGym(jsonRequest("/api/user/gym", { gymId: "gym-2" }))
    expect(res.status).toBe(403)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it("responde 400 si falta el gimnasio", async () => {
    sessionAs(gymlessMember)
    usersInDb(gymlessMember)
    const res = await joinGym(jsonRequest("/api/user/gym", {}))
    expect(res.status).toBe(400)
  })

  it("un miembro de un gimnasio no puede pasarse a otro por su cuenta (409)", async () => {
    sessionAs(member)
    usersInDb(member)
    gymsInDb(gym1, gym2)
    const res = await joinGym(jsonRequest("/api/user/gym", { gymId: "gym-2" }))
    expect(res.status).toBe(409)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ["no existe", null],
    ["está inactivo", { ...gym2, active: false }],
    ["es el gimnasio por defecto", { ...gym2, isDefault: true }],
  ])("responde 404 si el gimnasio %s", async (_case, gym) => {
    sessionAs(gymlessMember)
    usersInDb(gymlessMember)
    gymsInDb(...(gym ? [gym] : []))
    const res = await joinGym(jsonRequest("/api/user/gym", { gymId: "gym-2" }))
    expect(res.status).toBe(404)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it("un miembro sin gimnasio se vincula a uno activo", async () => {
    sessionAs(gymlessMember)
    usersInDb(gymlessMember)
    gymsInDb(gym2)
    const res = await joinGym(jsonRequest("/api/user/gym", { gymId: "gym-2" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ gym: { id: "gym-2", name: "Gym Norte" } })
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "member-9" },
      data: { gymId: "gym-2" },
    })
  })
})

// ---------------------------------------------------------------------------
// GET /api/members/search
// ---------------------------------------------------------------------------

describe("GET /api/members/search", () => {
  const search = (query: string) =>
    searchMembers(new Request(`http://localhost/api/members/search${query}`))

  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    expect((await search("?q=ana")).status).toBe(401)
  })

  it("responde 403 a un miembro", async () => {
    sessionAs(member)
    usersInDb(member)
    expect((await search("?q=ana")).status).toBe(403)
    expect(mocks.userFindMany).not.toHaveBeenCalled()
  })

  it("responde 400 sin término de búsqueda", async () => {
    sessionAs(admin)
    usersInDb(admin)
    expect((await search("")).status).toBe(400)
  })

  it("responde 400 si el admin o coach no tiene gimnasio", async () => {
    const coachSinGym = { ...coach, gymId: null }
    sessionAs(coachSinGym)
    usersInDb(coachSinGym)
    expect((await search("?q=ana")).status).toBe(400)
    expect(mocks.userFindMany).not.toHaveBeenCalled()
  })

  it("un admin solo busca en su gimnasio aunque pida otro por parámetro", async () => {
    sessionAs(admin)
    usersInDb(admin)
    mocks.userFindMany.mockResolvedValue([])
    const res = await search("?q=beto&gymId=gym-2")
    expect(res.status).toBe(200)
    expect(mocks.userFindMany.mock.calls[0][0].where).toMatchObject({
      role: "MEMBER",
      deletedAt: null,
      gymId: "gym-1",
    })
  })

  it("un coach busca en su gimnasio y ve si el miembro ya tiene coach", async () => {
    sessionAs(coach)
    usersInDb(coach)
    mocks.userFindMany.mockResolvedValue([
      { ...member, assignedTrainerId: null, trainerRequestsReceived: [{ id: "r1" }] },
      { ...member, id: "m-3", assignedTrainerId: null, trainerRequestsReceived: [] },
    ])
    const res = await search("?email=ana")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(mocks.userFindMany.mock.calls[0][0].where.gymId).toBe("gym-1")
    expect(body.members.map((m: { hasTrainer: boolean }) => m.hasTrainer)).toEqual([true, false])
    expect(body.members[0]).not.toHaveProperty("trainerRequestsReceived")
  })

  it("el superadmin debe indicar el gimnasio y busca en el que pide", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin)
    expect((await search("?q=ana")).status).toBe(400)
    mocks.userFindMany.mockResolvedValue([])
    expect((await search("?q=ana&gymId=gym-2")).status).toBe(200)
    expect(mocks.userFindMany.mock.calls[0][0].where.gymId).toBe("gym-2")
  })
})

// ---------------------------------------------------------------------------
// POST /api/trainer/members
// ---------------------------------------------------------------------------

describe("POST /api/trainer/members", () => {
  const newMember = { name: "Carla", email: "carla@test.com", password: "Segura123" }

  beforeEach(() => {
    mocks.userCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "nuevo-m",
      ...data,
    }))
  })

  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await createMember(jsonRequest("/api/trainer/members", newMember))
    expect(res.status).toBe(401)
  })

  it.each([
    ["TRAINER", coach],
    ["MEMBER", member],
    ["SUPER_ADMIN", superAdmin],
  ])("responde 403 si quien crea es %s", async (_role, actor) => {
    sessionAs(actor)
    usersInDb(actor)
    const res = await createMember(jsonRequest("/api/trainer/members", newMember))
    expect(res.status).toBe(403)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it("responde 403 si el admin no tiene gimnasio", async () => {
    const adminSinGym = { ...admin, gymId: null }
    sessionAs(adminSinGym)
    usersInDb(adminSinGym)
    const res = await createMember(jsonRequest("/api/trainer/members", newMember))
    expect(res.status).toBe(403)
  })

  it("responde 400 con datos inválidos", async () => {
    sessionAs(admin)
    usersInDb(admin)
    const res = await createMember(
      jsonRequest("/api/trainer/members", { ...newMember, password: "corta" })
    )
    expect(res.status).toBe(400)
  })

  it("responde 409 si el correo ya existe, aunque sea de otro gimnasio", async () => {
    sessionAs(admin)
    usersInDb(admin, otherGymMember)
    const res = await createMember(
      jsonRequest("/api/trainer/members", { ...newMember, email: otherGymMember.email })
    )
    expect(res.status).toBe(409)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it("el admin crea el miembro en su propio gimnasio, sin coach y sin devolver la contraseña", async () => {
    sessionAs(admin)
    usersInDb(admin)
    const res = await createMember(
      jsonRequest("/api/trainer/members", { ...newMember, phone: "  " })
    )
    expect(res.status).toBe(201)
    expect(mocks.userCreate.mock.calls[0][0].data).toMatchObject({
      role: "MEMBER",
      gymId: "gym-1",
      assignedTrainerId: null,
      phone: null,
      password: "hash-falso",
    })
    const body = await res.json()
    expect(body.user).toEqual({ id: "nuevo-m", email: newMember.email, name: newMember.name })
  })
})

// ---------------------------------------------------------------------------
// POST /api/notifications/send
// ---------------------------------------------------------------------------

describe("POST /api/notifications/send", () => {
  const notice = { title: "Hola", message: "Tu clase empieza pronto", userId: "member-1" }

  beforeEach(() => {
    mocks.notificationCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "n-1", ...data })
    )
    mocks.sendPush.mockResolvedValue({ success: true, sent: 1 })
    mocks.sendMembershipReminder.mockResolvedValue({ success: true })
  })

  it("responde 401 sin sesión", async () => {
    sessionAs(null)
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(401)
  })

  it("responde 404 si el usuario de la sesión no existe", async () => {
    sessionAs(admin)
    usersInDb()
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(404)
  })

  it("responde 403 a un miembro", async () => {
    sessionAs(member)
    usersInDb(member)
    const res = await sendNotification(
      jsonRequest("/api/notifications/send", { ...notice, userId: "member-2" })
    )
    expect(res.status).toBe(403)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("responde 400 sin título o con un tipo desconocido", async () => {
    sessionAs(admin)
    usersInDb(admin, member)
    const noTitle = await sendNotification(
      jsonRequest("/api/notifications/send", { ...notice, title: "" })
    )
    expect(noTitle.status).toBe(400)
    const badType = await sendNotification(
      jsonRequest("/api/notifications/send", { ...notice, type: "SPAM" })
    )
    expect(badType.status).toBe(400)
  })

  it("responde 404 si el destinatario no existe", async () => {
    sessionAs(admin)
    usersInDb(admin)
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(404)
  })

  it("un admin no puede notificar a un miembro de otro gimnasio (404, sin revelar que existe)", async () => {
    sessionAs(admin)
    usersInDb(admin, otherGymMember)
    const res = await sendNotification(
      jsonRequest("/api/notifications/send", { ...notice, userId: "member-2" })
    )
    expect(res.status).toBe(404)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
    expect(mocks.sendPush).not.toHaveBeenCalled()
  })

  it("un coach solo puede notificar a sus clientes", async () => {
    sessionAs(coach)
    usersInDb(coach, member)
    mocks.getTrainerClientIds.mockResolvedValue(["otro-cliente"])
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(403)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("un coach notifica a su cliente y se envía el push", async () => {
    sessionAs(coach)
    usersInDb(coach, member)
    mocks.getTrainerClientIds.mockResolvedValue(["member-1"])
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.notification).toMatchObject({ userId: "member-1", type: "INFO" })
    expect(body.email).toEqual({ triggered: false })
    expect(body.push).toMatchObject({ triggered: true, success: true, sent: 1 })
    expect(mocks.sendPush).toHaveBeenCalledWith("member-1", {
      title: notice.title,
      body: notice.message,
    })
    expect(mocks.emitRealtime).toHaveBeenCalledWith("notifications", "gym-1")
  })

  it("un admin notifica a un miembro de su gimnasio y manda el recordatorio de membresía por correo", async () => {
    sessionAs(admin)
    usersInDb(admin, member)
    const res = await sendNotification(
      jsonRequest("/api/notifications/send", {
        ...notice,
        type: "MEMBERSHIP",
        sendEmail: true,
        daysLeft: 3,
      })
    )
    expect(res.status).toBe(201)
    expect(mocks.sendMembershipReminder).toHaveBeenCalledWith("ana@test.com", "Ana", 3)
    expect((await res.json()).email).toMatchObject({ triggered: true, success: true })
  })

  it("el superadmin puede notificar a un miembro de cualquier gimnasio", async () => {
    sessionAs(superAdmin)
    usersInDb(superAdmin, otherGymMember)
    const res = await sendNotification(
      jsonRequest("/api/notifications/send", { ...notice, userId: "member-2" })
    )
    expect(res.status).toBe(201)
  })

  it("otro admin tampoco puede notificar a los miembros del gimnasio 1", async () => {
    sessionAs(otherAdmin)
    usersInDb(otherAdmin, member)
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(404)
  })

  it("un admin sin gimnasio no puede notificar a un usuario sin gimnasio", async () => {
    const gymlessAdmin = { ...admin, id: "admin-9", email: "admin9@test.com", gymId: null }
    sessionAs(gymlessAdmin)
    usersInDb(gymlessAdmin, { ...gymlessMember, id: "member-1" })
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(404)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("un coach no puede notificar a un cliente asignado que está en otro gimnasio", async () => {
    sessionAs(coach)
    usersInDb(coach, { ...otherGymMember, id: "member-1" })
    mocks.getTrainerClientIds.mockResolvedValue(["member-1"])
    const res = await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(res.status).toBe(404)
    expect(mocks.notificationCreate).not.toHaveBeenCalled()
  })

  it("busca los clientes del coach solo en su gimnasio", async () => {
    sessionAs(coach)
    usersInDb(coach, member)
    mocks.getTrainerClientIds.mockResolvedValue(["member-1"])
    await sendNotification(jsonRequest("/api/notifications/send", notice))
    expect(mocks.getTrainerClientIds).toHaveBeenCalledWith("coach-1", "gym-1")
  })
})
