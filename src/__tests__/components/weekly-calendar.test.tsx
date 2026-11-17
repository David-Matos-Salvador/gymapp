// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"

import { WeeklyCalendar } from "@/components/rutina/weekly-calendar"

// Fechas en hora local para que la prueba no dependa de la zona horaria de la máquina.
const wednesday = new Date(2026, 10, 18, 12, 0, 0)

function renderAt(now: Date, workoutDates: Date[] = []) {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(now)
  return render(<WeeklyCalendar workoutDates={workoutDates} />)
}

describe("WeeklyCalendar", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("muestra la semana de lunes a domingo con sus números de día", () => {
    const { container } = renderAt(wednesday)

    const labels = Array.from(container.querySelectorAll("span.uppercase")).map(
      (el) => el.textContent
    )
    expect(labels).toEqual(["L", "M", "M", "J", "V", "S", "D"])
    for (const day of [16, 17, 18, 19, 20, 21, 22]) {
      expect(screen.getByText(String(day))).toBeTruthy()
    }
  })

  it("si hoy es domingo, la semana sigue empezando el lunes anterior", () => {
    renderAt(new Date(2026, 10, 22, 20, 0, 0))

    expect(screen.getByText("16")).toBeTruthy()
    expect(screen.getByText("22").className).toContain("text-white")
    expect(screen.queryByText("23")).toBeNull()
  })

  it("resalta el día de hoy", () => {
    renderAt(wednesday)

    expect(screen.getByText("18").className).toContain("bg-accent-yellow text-white")
    expect(screen.getByText("17").className).toContain("text-muted-foreground")
  })

  it("marca los días entrenados de esta semana, aunque la hora no sea medianoche", () => {
    const { container } = renderAt(wednesday, [
      new Date(2026, 10, 16, 19, 30),
      new Date(2026, 10, 18, 7, 0),
    ])

    expect(screen.getByText("16").className).toContain("bg-accent-yellow/15")
    expect(container.querySelectorAll("span.h-1.w-1")).toHaveLength(2)
  })

  it("no marca entrenamientos de la semana pasada", () => {
    const { container } = renderAt(wednesday, [new Date(2026, 10, 15, 10, 0)])

    expect(container.querySelectorAll("span.h-1.w-1")).toHaveLength(0)
  })
})
