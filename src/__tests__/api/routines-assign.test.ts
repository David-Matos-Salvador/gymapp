import { describe, it, expect, vi, beforeEach } from "vitest"

const mockUserFindUnique = vi.fn()
const mockPlanFindUnique = vi.fn()
const mockAssignmentUpdateMany = vi.fn()
const mockAssignmentCreate = vi.fn()
const mockAssignmentUpsert = vi.fn()
const mockTransaction = vi.fn()
const mockAuth = vi.fn()
const mockGetTrainerClientIds = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    routinePlan: {
      findUnique: (...args: unknown[]) => mockPlanFindUnique(...args),
    },
    assignedRoutinePlan: {
      updateMany: (...args: unknown[]) => mockAssignmentUpdateMany(...args),
      create: (...args: unknown[]) => mockAssignmentCreate(...args),
      upsert: (...args: unknown[]) => mockAssignmentUpsert(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/trainer-client", () => ({
  getTrainerClientIds: (...args: unknown[]) => mockGetTrainerClientIds(...args),
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), { status: init?.status ?? 200 })
      Object.defineProperty(response, "json", { value: async () => body })
      return response
    }),
  },
}))

import { POST } from "@/app/api/routines/assign/route"

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/routines/assign", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )
}

const trainer = { id: "t1", role: "TRAINER", gymId: "g1" }
const client = { id: "c1", gymId: "g1", assignedTrainerId: "t1" }
const plan = { id: "p1", name: "Fuerza", user: { gymId: "g1" }, splits: [] }

describe("POST /api/routines/assign", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { email: "coach@test.com" } })
    mockUserFindUnique.mockImplementation(async ({ where }: { where: { email?: string } }) =>
      where.email ? trainer : client
    )
    mockGetTrainerClientIds.mockResolvedValue(["c1"])
    mockPlanFindUnique.mockResolvedValue(plan)
    mockAssignmentUpdateMany.mockResolvedValue({ count: 1 })
    mockAssignmentUpsert.mockResolvedValue({ id: "a1", userId: "c1", planId: "p1", plan })
    // El cliente ya tuvo esta rutina: crear otra fila choca con @@unique([userId, planId]).
    mockAssignmentCreate.mockRejectedValue(new Error("Unique constraint failed"))
    mockTransaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
  })

  it("rechaza a quien no inició sesión", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await post({ planId: "p1", assignToUserId: "c1" })
    expect(res.status).toBe(401)
  })

  it("rechaza al coach que asigna a alguien que no es su cliente", async () => {
    mockGetTrainerClientIds.mockResolvedValue([])
    const res = await post({ planId: "p1", assignToUserId: "c1" })
    expect(res.status).toBe(403)
    expect(mockAssignmentUpdateMany).not.toHaveBeenCalled()
  })

  it("vuelve a asignar una rutina que el cliente ya tuvo", async () => {
    const res = await post({ planId: "p1", assignToUserId: "c1" })

    expect(res.status).toBe(201)
    expect((await res.json()).assignment).toMatchObject({ id: "a1", planId: "p1" })
    expect(mockAssignmentCreate).not.toHaveBeenCalled()
    expect(mockAssignmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_planId: { userId: "c1", planId: "p1" } },
        update: expect.objectContaining({ active: true }),
        create: { userId: "c1", planId: "p1" },
      })
    )
  })

  it("no deja al cliente sin rutina: desactiva las otras en la misma transacción", async () => {
    await post({ planId: "p1", assignToUserId: "c1" })

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockTransaction.mock.calls[0][0]).toHaveLength(2)
    expect(mockAssignmentUpdateMany).toHaveBeenCalledWith({
      where: { userId: "c1", active: true, planId: { not: "p1" } },
      data: { active: false },
    })
  })
})
