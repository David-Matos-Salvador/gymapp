import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockMembershipFindFirst = vi.fn()
const mockAppointmentFindUnique = vi.fn()
const mockAppointmentCreate = vi.fn()
const mockAppointmentUpdateMany = vi.fn()
const mockNotificationCreate = vi.fn()
const mockAvailabilityDeleteMany = vi.fn()
const mockAvailabilityCreateMany = vi.fn()
const mockAvailabilityFindMany = vi.fn()
const mockQueryRaw = vi.fn()
const mockGetFreeSlots = vi.fn()
const mockEmitRealtime = vi.fn()

const tx = {
  $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  appointment: {
    create: (...args: unknown[]) => mockAppointmentCreate(...args),
    updateMany: (...args: unknown[]) => mockAppointmentUpdateMany(...args),
  },
  notification: { create: (...args: unknown[]) => mockNotificationCreate(...args) },
  coachAvailability: {
    deleteMany: (...args: unknown[]) => mockAvailabilityDeleteMany(...args),
    createMany: (...args: unknown[]) => mockAvailabilityCreateMany(...args),
    findMany: (...args: unknown[]) => mockAvailabilityFindMany(...args),
  },
}

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    membership: { findFirst: (...args: unknown[]) => mockMembershipFindFirst(...args) },
    appointment: { findUnique: (...args: unknown[]) => mockAppointmentFindUnique(...args) },
    coachAvailability: { findMany: (...args: unknown[]) => mockAvailabilityFindMany(...args) },
    $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
  },
}))

vi.mock("@/lib/coach-schedule-db", () => ({
  getFreeSlots: (...args: unknown[]) => mockGetFreeSlots(...args),
}))

vi.mock("@/lib/realtime", () => ({
  emitRealtime: (...args: unknown[]) => mockEmitRealtime(...args),
}))

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

import { POST as createAppointment } from "@/app/api/appointments/route"
import { PATCH as updateAppointment } from "@/app/api/appointments/[id]/route"
import { PUT as putAvailability } from "@/app/api/trainer/availability/route"

const SLOT = "2026-11-16T14:00:00.000Z"
const client = {
  id: "client-1",
  name: "Carlos",
  email: "carlos@test.com",
  role: "MEMBER",
  gymId: "gym-1",
  assignedTrainerId: "coach-1",
}
const coach = { id: "coach-1", name: "Coach", role: "TRAINER", gymId: "gym-1" }

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost:3000/api/x", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

/** Primera búsqueda: el usuario de la sesión (por email). Segunda: su coach (por id). */
function mockUsers(sessionUser: unknown, assignedCoach: unknown = coach) {
  mockUserFindUnique.mockImplementation(async ({ where }: { where: { email?: string } }) =>
    where.email ? sessionUser : assignedCoach
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { email: "carlos@test.com" } })
  mockUsers(client)
  mockMembershipFindFirst.mockResolvedValue({ id: "membership-1" })
  mockGetFreeSlots.mockResolvedValue({
    timeZone: "America/Lima",
    hasAvailability: true,
    slots: [{ startsAt: SLOT, date: "2026-11-16", time: "09:00" }],
  })
  mockAppointmentCreate.mockResolvedValue({ id: "appointment-1", startsAt: new Date(SLOT) })
})

describe("POST /api/appointments", () => {
  it("rechaza a quien no inició sesión", async () => {
    mockAuth.mockResolvedValue(null)
    const response = await createAppointment(jsonRequest("POST", { startsAt: SLOT }))
    expect(response.status).toBe(401)
  })

  it("rechaza una hora mal formada", async () => {
    const response = await createAppointment(jsonRequest("POST", { startsAt: "mañana" }))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Elige una hora válida" })
  })

  it("rechaza a un cliente sin coach asignado", async () => {
    mockUsers({ ...client, assignedTrainerId: null })
    const response = await createAppointment(jsonRequest("POST", { startsAt: SLOT }))
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Todavía no tienes un coach asignado" })
  })

  it("rechaza si el coach asignado es de otro gimnasio", async () => {
    mockUsers(client, { ...coach, gymId: "gym-2" })
    const response = await createAppointment(jsonRequest("POST", { startsAt: SLOT }))
    expect(response.status).toBe(403)
    expect(mockAppointmentCreate).not.toHaveBeenCalled()
  })

  it("exige una membresía activa y confirmada", async () => {
    mockMembershipFindFirst.mockResolvedValue(null)
    const response = await createAppointment(jsonRequest("POST", { startsAt: SLOT }))
    expect(response.status).toBe(403)
    expect(mockAppointmentCreate).not.toHaveBeenCalled()
  })

  it("responde 409 si la hora no está libre", async () => {
    const response = await createAppointment(
      jsonRequest("POST", { startsAt: "2026-11-16T15:00:00.000Z" })
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "Esa hora ya no está disponible. Elige otra." })
    expect(mockAppointmentCreate).not.toHaveBeenCalled()
    expect(mockNotificationCreate).not.toHaveBeenCalled()
  })

  it("reserva con el coach bloqueado, siempre con el coach asignado, y le avisa", async () => {
    const response = await createAppointment(
      // Un trainerId en el cuerpo se ignora: solo se reserva con el coach asignado.
      jsonRequest("POST", { startsAt: SLOT, trainerId: "otro-coach" })
    )
    expect(response.status).toBe(201)
    expect(mockQueryRaw).toHaveBeenCalledTimes(1)
    // Las horas libres se recalculan dentro de la transacción, después del bloqueo.
    expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetFreeSlots.mock.invocationCallOrder[0]
    )
    expect(mockGetFreeSlots).toHaveBeenCalledWith(tx, {
      id: "coach-1",
      name: "Coach",
      gymId: "gym-1",
    })
    expect(mockAppointmentCreate.mock.calls[0][0].data).toEqual({
      gymId: "gym-1",
      trainerId: "coach-1",
      clientId: "client-1",
      startsAt: new Date(SLOT),
    })
    expect(mockNotificationCreate.mock.calls[0][0].data).toMatchObject({
      userId: "coach-1",
      title: "Nueva sesión 1:1",
    })
    expect(mockNotificationCreate.mock.calls[0][0].data.message).toContain("09:00")
    expect(mockEmitRealtime).toHaveBeenCalledWith("notifications")
  })
})

describe("PATCH /api/appointments/[id]", () => {
  const params = { params: Promise.resolve({ id: "appointment-1" }) }
  const future = new Date(Date.now() + 3 * 86_400_000)
  const appointment = {
    id: "appointment-1",
    clientId: "client-1",
    trainerId: "coach-1",
    status: "CONFIRMED",
    startsAt: future,
    gym: { timezone: "America/Lima" },
  }
  const cancel = () => updateAppointment(jsonRequest("PATCH", { status: "CANCELLED" }), params)

  beforeEach(() => {
    mockAppointmentFindUnique.mockResolvedValue(appointment)
    mockAppointmentUpdateMany.mockResolvedValue({ count: 1 })
  })

  it("solo acepta cancelar", async () => {
    const response = await updateAppointment(jsonRequest("PATCH", { status: "COMPLETED" }), params)
    expect(response.status).toBe(400)
  })

  it("responde 404 a quien no participa en la sesión", async () => {
    mockUsers({ ...client, id: "intruso" })
    const response = await cancel()
    expect(response.status).toBe(404)
    expect(mockAppointmentUpdateMany).not.toHaveBeenCalled()
  })

  it("no cancela una sesión que ya empezó", async () => {
    mockAppointmentFindUnique.mockResolvedValue({
      ...appointment,
      startsAt: new Date(Date.now() - 60_000),
    })
    const response = await cancel()
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "No puedes cancelar una sesión que ya empezó" })
  })

  it("no cancela dos veces", async () => {
    mockAppointmentFindUnique.mockResolvedValue({ ...appointment, status: "CANCELLED" })
    expect((await cancel()).status).toBe(409)

    mockAppointmentFindUnique.mockResolvedValue(appointment)
    mockAppointmentUpdateMany.mockResolvedValue({ count: 0 })
    expect((await cancel()).status).toBe(409)
    expect(mockNotificationCreate).not.toHaveBeenCalled()
  })

  it("el cliente cancela y se avisa al coach", async () => {
    const response = await cancel()
    expect(response.status).toBe(200)
    expect(mockAppointmentUpdateMany.mock.calls[0][0]).toMatchObject({
      where: { id: "appointment-1", status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledById: "client-1" },
    })
    expect(mockNotificationCreate.mock.calls[0][0].data.userId).toBe("coach-1")
  })

  it("el coach cancela y se avisa al cliente", async () => {
    mockUsers({ ...coach, email: "coach@test.com" })
    const response = await cancel()
    expect(response.status).toBe(200)
    expect(mockNotificationCreate.mock.calls[0][0].data.userId).toBe("client-1")
  })
})

describe("PUT /api/trainer/availability", () => {
  const blocks = [{ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "12:00" }]

  beforeEach(() => {
    mockUsers({ ...coach, email: "coach@test.com" })
    mockAvailabilityFindMany.mockResolvedValue(blocks)
  })

  it("no deja que un miembro defina horas", async () => {
    mockUsers(client)
    const response = await putAvailability(jsonRequest("PUT", { blocks }))
    expect(response.status).toBe(403)
    expect(mockAvailabilityDeleteMany).not.toHaveBeenCalled()
  })

  it("rechaza bloques que se cruzan, sin tocar lo guardado", async () => {
    const response = await putAvailability(
      jsonRequest("PUT", {
        blocks: [...blocks, { dayOfWeek: "MONDAY", startTime: "11:00", endTime: "13:00" }],
      })
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Tienes bloques que se cruzan el lunes" })
    expect(mockAvailabilityDeleteMany).not.toHaveBeenCalled()
  })

  it("reemplaza solo la disponibilidad del coach que la envía", async () => {
    const response = await putAvailability(jsonRequest("PUT", { blocks }))
    expect(response.status).toBe(200)
    expect(mockAvailabilityDeleteMany).toHaveBeenCalledWith({ where: { trainerId: "coach-1" } })
    expect(mockAvailabilityCreateMany).toHaveBeenCalledWith({
      data: [{ ...blocks[0], trainerId: "coach-1" }],
    })
    expect(await response.json()).toEqual({ blocks })
  })
})
