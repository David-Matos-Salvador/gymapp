import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSplitFindUnique = vi.fn()
const mockGymExerciseFindMany = vi.fn()
const mockWorkoutLogFindFirst = vi.fn()
const mockCanReadPlan = vi.fn()
const mockGetEffectiveGym = vi.fn()
const mockGetDefaultGym = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    routineSplit: { findUnique: (...args: unknown[]) => mockSplitFindUnique(...args) },
    gymExercise: { findMany: (...args: unknown[]) => mockGymExerciseFindMany(...args) },
    workoutLog: { findFirst: (...args: unknown[]) => mockWorkoutLogFindFirst(...args) },
  },
}))

vi.mock("@/lib/routine-access", () => ({
  canReadPlan: (...args: unknown[]) => mockCanReadPlan(...args),
}))

vi.mock("@/lib/effective-gym", () => ({
  getEffectiveGym: (...args: unknown[]) => mockGetEffectiveGym(...args),
  getDefaultGym: (...args: unknown[]) => mockGetDefaultGym(...args),
}))

import { getSplitForWorkout } from "@/lib/workout-split"

// Issue #12, punto 2: la pantalla de entrenar se dibujaba vacía y pedía sus datos después,
// desde el navegador. Ahora la página los carga en el servidor y los pasa ya listos.
const CARPETA = path.join(process.cwd(), "src/app/my-routine/[planId]/workout/[splitId]")
const leer = (archivo: string) => readFileSync(path.join(CARPETA, archivo), "utf8")

describe("la pantalla de entrenar llega con sus datos", () => {
  it("la página es del servidor y carga el split antes de dibujar", () => {
    const pagina = leer("page.tsx")
    expect(pagina).not.toMatch(/^["']use client["']/m)
    expect(pagina).toContain("getSplitForWorkout(")
  })

  it("el componente del navegador ya no pide el split a la API", () => {
    const cliente = leer("workout-client.tsx")
    expect(cliente).toMatch(/^["']use client["']/m)
    expect(cliente).not.toContain("/api/routine-splits")
  })
})

describe("getSplitForWorkout", () => {
  const user = { id: "u1", role: "MEMBER", gymId: "g1" }

  function ejercicio(id: string, gymEquipments: unknown[] = []) {
    return {
      id: `se-${id}`,
      exerciseId: id,
      sets: 3,
      reps: "10",
      weight: 20,
      restSeconds: 60,
      order: 0,
      exercise: { id, name: `Ejercicio ${id}`, gymEquipments },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCanReadPlan.mockResolvedValue(true)
    mockGetEffectiveGym.mockResolvedValue({ id: "g1", showMachineNumbers: true })
    mockGetDefaultGym.mockResolvedValue(null)
    mockGymExerciseFindMany.mockResolvedValue([])
    mockWorkoutLogFindFirst.mockResolvedValue(null)
  })

  it("devuelve null si el split no existe", async () => {
    mockSplitFindUnique.mockResolvedValue(null)
    expect(await getSplitForWorkout("no-existe", user)).toBeNull()
  })

  it("devuelve null si el usuario no puede ver el plan", async () => {
    mockSplitFindUnique.mockResolvedValue({ id: "s1", planId: "p1", exercises: [] })
    mockCanReadPlan.mockResolvedValue(false)
    expect(await getSplitForWorkout("s1", user)).toBeNull()
    expect(mockCanReadPlan).toHaveBeenCalledWith("p1", user)
  })

  it("deja solo los ejercicios activos en el gimnasio del usuario", async () => {
    mockSplitFindUnique.mockResolvedValue({
      id: "s1",
      planId: "p1",
      exercises: [ejercicio("a"), ejercicio("b")],
    })
    mockGymExerciseFindMany.mockResolvedValue([{ exerciseId: "b" }])

    const data = await getSplitForWorkout("s1", user)
    expect(data?.split.exercises.map((e) => e.exerciseId)).toEqual(["b"])
    expect(data?.gym).toEqual({ id: "g1", showMachineNumbers: true })
  })

  it("muestra las máquinas del gimnasio con el número que ese gimnasio les puso", async () => {
    const propia = {
      id: "m1",
      name: "Prensa",
      machineNumber: 4,
      location: null,
      gymId: "g1",
      imageUrl: null,
      activations: [],
    }
    const global = {
      id: "m2",
      name: "Polea",
      machineNumber: 1,
      location: null,
      gymId: null,
      imageUrl: null,
      activations: [{ gymId: "g1", machineNumber: 9, imageUrl: "/polea.jpg", active: true }],
    }
    const ajena = { ...propia, id: "m3", gymId: "g2" }
    mockSplitFindUnique.mockResolvedValue({
      id: "s1",
      planId: "p1",
      exercises: [ejercicio("a", [propia, global, ajena])],
    })

    const data = await getSplitForWorkout("s1", user)
    const maquinas = data?.split.exercises[0].exercise.gymEquipments
    expect(maquinas?.map((m) => [m.id, m.machineNumber, m.imageUrl])).toEqual([
      ["m1", 4, null],
      ["m2", 9, "/polea.jpg"],
    ])
  })

  it("trae las series del último entrenamiento, ordenadas por número de serie", async () => {
    mockSplitFindUnique.mockResolvedValue({ id: "s1", planId: "p1", exercises: [ejercicio("a")] })
    mockWorkoutLogFindFirst.mockResolvedValue({
      sets: [
        { exerciseId: "a", setNumber: 2, weight: 25, reps: 8 },
        { exerciseId: "a", setNumber: 1, weight: 20, reps: 10 },
      ],
    })

    const data = await getSplitForWorkout("s1", user)
    expect(data?.lastPerformance).toEqual({
      a: [
        { weight: 20, reps: 10 },
        { weight: 25, reps: 8 },
      ],
    })
    expect(mockWorkoutLogFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", splitId: "s1" } })
    )
  })
})
