// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"

// Issue #199: antes de «Iniciar entrenamiento» la pantalla solo decía «4 ejercicios».
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("@/components/layout/shell", () => ({
  AppShell: ({ children }: { children?: React.ReactNode }) => children,
}))

import { WorkoutClient } from "@/app/my-routine/[planId]/workout/[splitId]/workout-client"
import type { SplitData } from "@/types/exercise"

afterEach(cleanup)

const ejercicio = (id: string, name: string, muscleGroup: string, sets: number, reps: string) => ({
  id: `se-${id}`,
  exerciseId: id,
  sets,
  reps,
  weight: 0,
  restSeconds: 60,
  order: 0,
  exercise: { id, name, muscleGroup, equipment: "BARBELL" },
})

const split = {
  id: "split-a",
  name: "Base para empezar - A",
  description: null,
  estimatedDuration: 45,
  plan: { id: "plan-1", name: "Base para empezar" },
  exercises: [
    ejercicio("e1", "Press de banca", "CHEST", 3, "10"),
    ejercicio("e2", "Remo con barra", "BACK", 4, "8-12"),
  ],
} as unknown as SplitData

describe("pantalla antes de iniciar el entrenamiento", () => {
  it("lista los ejercicios del día con músculo y series × repeticiones", () => {
    render(<WorkoutClient planId="plan-1" split={split} gym={null} lastPerformance={{}} />)

    expect(screen.getByText("2 ejercicios · unos 45 min")).toBeTruthy()
    const lista = screen.getByRole("list", { name: "Ejercicios de hoy" })
    const filas = within(lista).getAllByRole("listitem")
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByText("Press de banca")).toBeTruthy()
    expect(within(filas[0]).getByText("Pecho")).toBeTruthy()
    expect(within(filas[0]).getByText("3 × 10")).toBeTruthy()
    expect(within(filas[1]).getByText("Remo con barra")).toBeTruthy()
    expect(within(filas[1]).getByText("4 × 8-12")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Iniciar entrenamiento/ })).toBeTruthy()
  })
})
