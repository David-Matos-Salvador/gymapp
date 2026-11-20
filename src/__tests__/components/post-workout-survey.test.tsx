// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"

import { PostWorkoutSurvey } from "@/components/workout/post-workout-survey"

function renderSurvey(open = true) {
  const handlers = { onClose: vi.fn(), onSubmit: vi.fn() }
  render(<PostWorkoutSurvey open={open} {...handlers} />)
  return handlers
}

/** Botón de una cara: su nombre es el emoji seguido de la etiqueta («🙂Bien»). */
function face(label: string) {
  return screen.getByRole("button", { name: new RegExp(`^\\S+\\s*${label}$`) })
}

describe("PostWorkoutSurvey", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("cerrada no muestra nada", () => {
    renderSurvey(false)

    expect(screen.queryByText("¿Cómo te sentiste?")).toBeNull()
  })

  it("abierta pregunta cómo te sentiste y ofrece cinco caras y «Omitir»", () => {
    renderSurvey()

    expect(screen.getByRole("heading", { name: "¿Cómo te sentiste?" })).toBeTruthy()
    expect(screen.getByText("Valora tu entrenamiento de hoy")).toBeTruthy()
    for (const label of ["Muy mal", "Regular", "Bien", "Muy bien", "Excelente"]) {
      expect(face(label)).toBeTruthy()
    }
    expect(screen.getByRole("button", { name: "Omitir" })).toBeTruthy()
  })

  it.each([
    ["Muy mal", 1],
    ["Regular", 2],
    ["Bien", 3],
    ["Muy bien", 4],
    ["Excelente", 5],
  ])("elegir «%s» envía la nota %i tras un momento", (label, value) => {
    const handlers = renderSurvey()

    fireEvent.click(face(label))
    expect(handlers.onSubmit).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(handlers.onSubmit).toHaveBeenCalledWith(value)
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1)
    expect(handlers.onClose).not.toHaveBeenCalled()
  })

  it("«Omitir» cierra sin enviar nota", () => {
    const handlers = renderSurvey()

    fireEvent.click(screen.getByRole("button", { name: "Omitir" }))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(handlers.onClose).toHaveBeenCalled()
    expect(handlers.onSubmit).not.toHaveBeenCalled()
  })

  it.todo(
    "tocar dos caras seguidas (o la misma dos veces) antes de 400 ms envía la nota dos veces: " +
      "`handleSelect` no bloquea mientras espera (post-workout-survey.tsx:24)"
  )

  it.todo(
    "tocar una cara y luego «Omitir» antes de 400 ms cierra y aun así envía la nota: " +
      "el `setTimeout` no se cancela (post-workout-survey.tsx:26)"
  )

  it.todo(
    'la encuesta no se anuncia como diálogo: falta `role="dialog"`, `aria-modal` y cerrar con ' +
      "Escape (post-workout-survey.tsx:35)"
  )
})
