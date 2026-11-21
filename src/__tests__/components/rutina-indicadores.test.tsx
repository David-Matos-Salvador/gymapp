// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"

import { DailyStreak } from "@/components/rutina/daily-streak"
import { WeeklyProgress } from "@/components/rutina/weekly-progress"

describe("DailyStreak", () => {
  it("sin racha lo muestra en gris", () => {
    const { container } = render(<DailyStreak streakDays={0} />)

    expect(screen.getByText("0 días seguidos")).toBeTruthy()
    expect((container.firstChild as HTMLElement).className).toContain("bg-muted")
  })

  it("usa singular con un día", () => {
    render(<DailyStreak streakDays={1} />)

    expect(screen.getByText("1 día seguido")).toBeTruthy()
  })

  it("con racha lo resalta en naranja", () => {
    const { container } = render(<DailyStreak streakDays={5} />)

    expect(screen.getByText("5 días seguidos")).toBeTruthy()
    expect((container.firstChild as HTMLElement).className).toContain("text-orange-500")
  })
})

function barWidth(container: HTMLElement) {
  return (container.querySelector("[style]") as HTMLElement).style.width
}

describe("WeeklyProgress", () => {
  it("muestra el avance de la semana", () => {
    const { container } = render(<WeeklyProgress completed={2} target={4} />)

    expect(screen.getByText("Progreso semanal")).toBeTruthy()
    expect(screen.getByText("2 de 4 días")).toBeTruthy()
    expect(barWidth(container)).toBe("50%")
  })

  it("usa singular cuando la meta es un día", () => {
    render(<WeeklyProgress completed={0} target={1} />)

    expect(screen.getByText("0 de 1 día")).toBeTruthy()
  })

  it("si se pasa de la meta, la barra no supera el 100 % y el número se resalta", () => {
    const { container } = render(<WeeklyProgress completed={5} target={4} />)

    expect(barWidth(container)).toBe("100%")
    expect(screen.getByText("5 de 4 días").className).toContain("text-gold")
  })

  it("sin meta no divide entre cero", () => {
    const { container } = render(<WeeklyProgress completed={0} target={0} />)

    expect(barWidth(container)).toBe("0%")
  })
})
