// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { EXIT_WITH_UNSAVED_SETS_MESSAGE, WorkoutTopBar } from "@/components/workout/workout-top-bar"

// Issue #140: al entrenar no hay header ni menú; esta barra es la forma de orientarse y salir.
function renderBar(overrides: Partial<Parameters<typeof WorkoutTopBar>[0]> = {}) {
  const onExit = vi.fn()
  render(
    <WorkoutTopBar
      splitName="Torso / Piernas - A"
      isActive
      elapsedFormatted="05:12"
      completedExercises={1}
      totalExercises={3}
      hasUnsavedSets={false}
      onExit={onExit}
      {...overrides}
    />
  )
  return onExit
}

describe("WorkoutTopBar", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("muestra la división, el avance y el tiempo", () => {
    renderBar()

    expect(screen.getByText("Torso / Piernas - A")).toBeTruthy()
    expect(screen.getByLabelText("1 de 3 ejercicios").textContent).toBe("1/3")
    expect(screen.getByText("05:12")).toBeTruthy()
  })

  it("antes de iniciar solo muestra cómo salir y el nombre", () => {
    renderBar({ isActive: false })

    expect(screen.getByRole("button", { name: /Salir/ })).toBeTruthy()
    expect(screen.queryByText("05:12")).toBeNull()
  })

  it("sin series pendientes sale sin preguntar", () => {
    const confirm = vi.spyOn(window, "confirm")
    const onExit = renderBar()

    fireEvent.click(screen.getByRole("button", { name: /Salir/ }))

    expect(confirm).not.toHaveBeenCalled()
    expect(onExit).toHaveBeenCalledOnce()
  })

  it("con series sin guardar pide confirmación y respeta el «no»", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    const onExit = renderBar({ hasUnsavedSets: true })

    fireEvent.click(screen.getByRole("button", { name: /Salir/ }))

    expect(confirm).toHaveBeenCalledWith(EXIT_WITH_UNSAVED_SETS_MESSAGE)
    expect(onExit).not.toHaveBeenCalled()
  })

  it("con series sin guardar sale si la persona confirma", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const onExit = renderBar({ hasUnsavedSets: true })

    fireEvent.click(screen.getByRole("button", { name: /Salir/ }))

    expect(onExit).toHaveBeenCalledOnce()
  })
})
