// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { SplitCard } from "@/components/rutina/split-card"

const base = {
  id: "split-a",
  label: "A",
  name: "Pecho y espalda",
  description: null,
  muscleGroups: ["CHEST", "BACK"],
  exerciseCount: 3,
}

function progressWidth(container: HTMLElement) {
  return (container.querySelector("[style]") as HTMLElement).style.width
}

describe("SplitCard", () => {
  it("muestra letra, nombre, músculos en español y cantidad de ejercicios", () => {
    render(<SplitCard {...base} variant="default" onClick={vi.fn()} />)

    expect(screen.getByText("A")).toBeTruthy()
    expect(screen.getByText("Pecho y espalda")).toBeTruthy()
    expect(screen.getByText("Pecho · Espalda")).toBeTruthy()
    expect(screen.getByText("3 ejercicios")).toBeTruthy()
  })

  it("usa singular con un solo ejercicio y deja tal cual un músculo sin traducción", () => {
    render(
      <SplitCard
        {...base}
        muscleGroups={["CHEST", "NECK"]}
        exerciseCount={1}
        variant="default"
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText("1 ejercicio")).toBeTruthy()
    expect(screen.getByText("Pecho · NECK")).toBeTruthy()
  })

  it("al tocarla llama a onClick", () => {
    const onClick = vi.fn()
    render(<SplitCard {...base} variant="default" onClick={onClick} />)

    fireEvent.click(screen.getByRole("button"))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("la propuesta del día lleva la etiqueta «Propuesto»", () => {
    render(<SplitCard {...base} variant="proposed" onClick={vi.fn()} />)

    expect(screen.getByText("Propuesto")).toBeTruthy()
    expect(screen.queryByText("En curso")).toBeNull()
  })

  it("en curso muestra la etiqueta y el avance de ejercicios", () => {
    const { container } = render(
      <SplitCard {...base} variant="in-progress" completedExerciseCount={1} onClick={vi.fn()} />
    )

    expect(screen.getByText("En curso")).toBeTruthy()
    expect(progressWidth(container)).toBe("33%")
  })

  it("completada muestra «Completado» y un check en lugar de la letra", () => {
    render(<SplitCard {...base} variant="completed" onClick={vi.fn()} />)

    expect(screen.getByText("Completado")).toBeTruthy()
    expect(screen.queryByText("A")).toBeNull()
  })

  // Posible fallo: el avance solo se calcula para «en curso»; en una división completada la
  // barra (pintada de color lleno) queda con width 0 % y no se ve (split-card.tsx:30-31).
  it.todo("completada llena la barra de avance al 100 %")

  it("bloqueada no se puede tocar y lo dice", () => {
    const onClick = vi.fn()
    render(<SplitCard {...base} variant="locked" onClick={onClick} />)

    const button = screen.getByRole("button") as HTMLButtonElement
    expect(screen.getByText("Bloqueado")).toBeTruthy()
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("sin ejercicios no divide entre cero", () => {
    const { container } = render(
      <SplitCard
        {...base}
        exerciseCount={0}
        variant="in-progress"
        completedExerciseCount={0}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText("0 ejercicios")).toBeTruthy()
    expect(progressWidth(container)).toBe("0%")
  })
})
