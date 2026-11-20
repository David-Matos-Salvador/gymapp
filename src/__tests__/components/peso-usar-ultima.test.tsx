// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

// «Última: … · usar» no movía el contador de peso, y cambiar el peso con el contador
// reescribía también el de las series ya hechas.
vi.mock("@/components/workout/exercise-detail-sheet", () => ({
  ExerciseDetailSheet: ({ children }: { children?: React.ReactNode }) => children,
}))

import { ExerciseCard } from "@/components/workout/exercise-card"
import { useWorkoutStore, type SetLog } from "@/stores/workout-store"
import type { SplitExercise } from "@/types/exercise"

afterEach(cleanup)

const se: SplitExercise = {
  id: "se-1",
  exerciseId: "e1",
  sets: 3,
  reps: "10",
  weight: 20,
  restSeconds: 0,
  order: 0,
  exercise: { id: "e1", name: "Press de banca", muscleGroup: "CHEST", equipment: "BARBELL" },
}

const serie = (setNumber: number, weight: number, completed: boolean): SetLog => ({
  exerciseId: "e1",
  exerciseName: "Press de banca",
  setNumber,
  reps: 10,
  weight,
  restSeconds: 0,
  completed,
})

describe("contador de peso de la tarjeta de ejercicio", () => {
  it("«usar» la última marca también actualiza el contador, y «+» suma desde ahí", () => {
    const onWeightChange = vi.fn()
    render(
      <ExerciseCard
        se={se}
        setsData={[serie(1, 20, false), serie(2, 20, false)]}
        appearance="current"
        onWeightChange={onWeightChange}
        onSetUpdate={vi.fn()}
        lastPerformance={[{ weight: 40, reps: 8 }]}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Última: 40 kg × 8 · usar/ }))
    expect(screen.getByText("40")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Aumentar kg" }))
    expect(onWeightChange).toHaveBeenLastCalledWith(42.5)
  })
})

describe("updateAllSetWeights", () => {
  beforeEach(() => useWorkoutStore.getState().resetWorkout())

  it("cambia el peso de las series pendientes y deja el de las ya hechas", () => {
    useWorkoutStore.getState().setSetsData({ e1: [serie(1, 40, true), serie(2, 40, false)] })

    useWorkoutStore.getState().updateAllSetWeights("e1", 45)

    const [hecha, pendiente] = useWorkoutStore.getState().setsData.e1
    expect(hecha.weight).toBe(40)
    expect(pendiente.weight).toBe(45)
  })
})
