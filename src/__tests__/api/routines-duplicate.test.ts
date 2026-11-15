import { describe, it, expect, vi, beforeEach } from "vitest"

const mockUserFindUnique = vi.fn()
const mockPlanFindUnique = vi.fn()
const mockPlanCreate = vi.fn()
const mockAssignmentFindFirst = vi.fn()
const mockAssignmentCount = vi.fn()
const mockAssignmentUpdateMany = vi.fn()
const mockAssignmentCreate = vi.fn()
const mockWorkoutLogUpdateMany = vi.fn()
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
      create: (...args: unknown[]) => mockPlanCreate(...args),
    },
    assignedRoutinePlan: {
      findFirst: (...args: unknown[]) => mockAssignmentFindFirst(...args),
      count: (...args: unknown[]) => mockAssignmentCount(...args),
      updateMany: (...args: unknown[]) => mockAssignmentUpdateMany(...args),
      create: (...args: unknown[]) => mockAssignmentCreate(...args),
    },
    workoutLog: {
      updateMany: (...args: unknown[]) => mockWorkoutLogUpdateMany(...args),
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

import { GET, POST } from "@/app/api/routines/duplicate/route"
import { personalizedPlanName, personalizeConfirmQuestion } from "@/lib/routine-personalization"

function open(planId = "p1", assignedUserId = "c1") {
  return GET(
    new Request(
      `http://localhost/api/routines/duplicate?planId=${planId}&assignedUserId=${assignedUserId}`
    )
  )
}

function save(body: Record<string, unknown> = { planId: "p1", assignedUserId: "c1" }) {
  return POST(
    new Request("http://localhost/api/routines/duplicate", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )
}

const trainer = { id: "t1", role: "TRAINER", gymId: "g1" }
const client = { id: "c1", name: "Carlos Mendoza", gymId: "g1", assignedTrainerId: "t1" }
const sourcePlan = {
  id: "p1",
  name: "Fuerza",
  description: null,
  objective: null,
  frequency: 3,
  difficulty: null,
  userId: "admin1",
  user: { id: "admin1", role: "SUPER_ADMIN", gymId: null },
  splits: [
    { id: "s1", label: "A", name: "Empuje", muscleGroups: [], exercises: [] },
    { id: "s2", label: "B", name: "Tracción", muscleGroups: [], exercises: [] },
  ],
}
const copy = {
  id: "p2",
  name: "Fuerza (personalizada para Carlos)",
  splits: [
    { id: "n1", label: "A", exercises: [] },
    { id: "n2", label: "B", exercises: [] },
  ],
}

// La copia que ya tiene el cliente: es del coach y solo la usa él.
const ownCopy = { ...copy, userId: "t1", user: { id: "t1", role: "TRAINER", gymId: "g1" } }

function expectNoWrites() {
  expect(mockPlanCreate).not.toHaveBeenCalled()
  expect(mockAssignmentUpdateMany).not.toHaveBeenCalled()
  expect(mockAssignmentCreate).not.toHaveBeenCalled()
  expect(mockWorkoutLogUpdateMany).not.toHaveBeenCalled()
  expect(mockTransaction).not.toHaveBeenCalled()
}

describe("/api/routines/duplicate (#126)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { email: "coach@test.com" } })
    mockUserFindUnique.mockImplementation((args: { where: { email?: string; id?: string } }) =>
      Promise.resolve(args.where.email ? trainer : client)
    )
    mockGetTrainerClientIds.mockResolvedValue(["c1"])
    // Primera consulta: el plan de origen. Las de choque de nombre no encuentran nada.
    mockPlanFindUnique.mockImplementation((args: { where: { id?: string } }) =>
      Promise.resolve(args.where.id === "p1" ? sourcePlan : null)
    )
    mockAssignmentFindFirst.mockResolvedValue(null)
    mockAssignmentCount.mockResolvedValue(0)
    mockPlanCreate.mockResolvedValue(copy)
    mockTransaction.mockResolvedValue([])
  })

  describe("GET: abrir «Personalizar»", () => {
    it("entrar y salir sin tocar nada no cambia la rutina asignada", async () => {
      const res = await open()

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.plan.id).toBe("p1")
      expect(body.needsCopy).toBe(true)
      expect(body.clientName).toBe("Carlos Mendoza")
      expectNoWrites()
    })

    it("si el cliente ya tiene su copia, se edita esa y no hace falta otra", async () => {
      mockAssignmentFindFirst.mockResolvedValue({ planId: "p2" })
      mockPlanFindUnique.mockImplementation((args: { where: { id?: string } }) =>
        Promise.resolve(args.where.id === "p2" ? ownCopy : sourcePlan)
      )

      const body = await (await open("p2")).json()

      expect(body.plan.id).toBe("p2")
      expect(body.needsCopy).toBe(false)
      expectNoWrites()
    })

    it("un plan del coach que usan otros clientes sí necesita copia", async () => {
      mockAssignmentFindFirst.mockResolvedValue({ planId: "p1" })
      mockAssignmentCount.mockResolvedValue(2)

      const body = await (await open()).json()

      expect(body.needsCopy).toBe(true)
      expect(mockAssignmentCount).toHaveBeenCalledWith({
        where: { planId: "p1", active: true, userId: { not: "c1" } },
      })
    })

    it("responde 401 sin sesión y 403 si el miembro no es cliente del coach", async () => {
      mockAuth.mockResolvedValueOnce(null)
      expect((await open()).status).toBe(401)

      mockGetTrainerClientIds.mockResolvedValue([])
      expect((await open()).status).toBe(403)
      expectNoWrites()
    })

    it("responde 400 si falta el plan o el cliente", async () => {
      const res = await GET(new Request("http://localhost/api/routines/duplicate?planId=p1"))
      expect(res.status).toBe(400)
    })
  })

  describe("POST: guardar el primer cambio", () => {
    it("crea la copia con un nombre que la distingue y se la asigna al cliente", async () => {
      const res = await save()

      expect(res.status).toBe(201)
      expect(mockPlanCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Fuerza (personalizada para Carlos)",
            userId: "t1",
          }),
        })
      )
      expect(mockAssignmentUpdateMany).toHaveBeenCalledWith({
        where: { userId: "c1", active: true },
        data: { active: false },
      })
      expect(mockAssignmentCreate).toHaveBeenCalledWith({ data: { userId: "c1", planId: "p2" } })
      expect(mockTransaction).toHaveBeenCalledTimes(1)
    })

    it("el historial del cliente pasa a los mismos días de la copia", async () => {
      await save()

      expect(mockWorkoutLogUpdateMany).toHaveBeenCalledTimes(2)
      expect(mockWorkoutLogUpdateMany).toHaveBeenCalledWith({
        where: { userId: "c1", splitId: "s1" },
        data: { splitId: "n1" },
      })
      expect(mockWorkoutLogUpdateMany).toHaveBeenCalledWith({
        where: { userId: "c1", splitId: "s2" },
        data: { splitId: "n2" },
      })
    })

    it("si ya existe una rutina con ese nombre, agrega un número", async () => {
      mockPlanFindUnique.mockImplementation(
        (args: { where: { id?: string; name_userId?: { name: string } } }) => {
          if (args.where.id === "p1") return Promise.resolve(sourcePlan)
          return Promise.resolve(
            args.where.name_userId?.name === "Fuerza (personalizada para Carlos)"
              ? { id: "otra" }
              : null
          )
        }
      )

      await save()

      expect(mockPlanCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Fuerza (personalizada para Carlos) 2" }),
        })
      )
    })

    it("si el cliente ya tiene su copia, no crea otra", async () => {
      mockAssignmentFindFirst.mockResolvedValue({ planId: "p2" })
      mockPlanFindUnique.mockImplementation((args: { where: { id?: string } }) =>
        Promise.resolve(args.where.id === "p2" ? ownCopy : sourcePlan)
      )

      const res = await save({ planId: "p2", assignedUserId: "c1" })

      expect(res.status).toBe(200)
      expect((await res.json()).reused).toBe(true)
      expectNoWrites()
    })
  })
})

describe("personalizedPlanName", () => {
  it("usa el primer nombre del cliente", () => {
    expect(personalizedPlanName("Fuerza", "Carlos Mendoza")).toBe(
      "Fuerza (personalizada para Carlos)"
    )
  })

  it("no encadena sufijos al copiar una rutina ya personalizada", () => {
    expect(personalizedPlanName("Fuerza (personalizada para Ana) 2", "Carlos")).toBe(
      "Fuerza (personalizada para Carlos)"
    )
  })

  it("funciona sin nombre de cliente", () => {
    expect(personalizedPlanName("Fuerza", null)).toBe("Fuerza (personalizada para tu cliente)")
    expect(personalizeConfirmQuestion(null)).toBe(
      "Se creará una copia personalizada de la rutina para este cliente. ¿Continuar?"
    )
  })

  it("la pregunta nombra al cliente", () => {
    expect(personalizeConfirmQuestion("Carlos Mendoza")).toBe(
      "Se creará una copia personalizada de la rutina para Carlos. ¿Continuar?"
    )
  })
})
