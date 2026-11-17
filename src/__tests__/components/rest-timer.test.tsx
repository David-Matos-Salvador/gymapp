// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { RestTimer } from "@/components/workout/rest-timer"

function renderTimer(overrides: Partial<Parameters<typeof RestTimer>[0]> = {}) {
  const handlers = { onPause: vi.fn(), onResume: vi.fn(), onSkip: vi.fn() }
  render(<RestTimer remaining={90} total={90} status="running" {...handlers} {...overrides} />)
  return handlers
}

describe("RestTimer", () => {
  it("muestra el tiempo restante en mm:ss y la palabra «descanso»", () => {
    renderTimer({ remaining: 75 })

    expect(screen.getByText("01:15")).toBeTruthy()
    expect(screen.getByText("descanso")).toBeTruthy()
  })

  it("corriendo, el botón pausa", () => {
    const { onPause, onResume } = renderTimer()

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }))

    expect(onPause).toHaveBeenCalledOnce()
    expect(onResume).not.toHaveBeenCalled()
  })

  it("en pausa, el botón reanuda", () => {
    const { onPause, onResume } = renderTimer({ status: "paused" })

    fireEvent.click(screen.getByRole("button", { name: "Reanudar" }))

    expect(onResume).toHaveBeenCalledOnce()
    expect(onPause).not.toHaveBeenCalled()
  })

  it("«Saltar» termina el descanso", () => {
    const { onSkip } = renderTimer()

    fireEvent.click(screen.getByRole("button", { name: "Saltar" }))

    expect(onSkip).toHaveBeenCalledOnce()
  })

  it("en los últimos 5 segundos se pone en rojo y parpadea", () => {
    const { container } = render(
      <RestTimer
        remaining={5}
        total={90}
        status="running"
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkip={vi.fn()}
      />
    )

    expect(screen.getByText("00:05").className).toContain("animate-pulse")
    expect(container.querySelectorAll("circle")[1].getAttribute("class")).toContain("text-red-500")
  })

  it("entre 6 y 10 segundos se pone ámbar, sin parpadear", () => {
    const { container } = render(
      <RestTimer
        remaining={8}
        total={90}
        status="running"
        onPause={vi.fn()}
        onResume={vi.fn()}
        onSkip={vi.fn()}
      />
    )

    expect(screen.getByText("00:08").className).not.toContain("animate-pulse")
    expect(container.querySelectorAll("circle")[1].getAttribute("class")).toContain(
      "text-amber-500"
    )
  })
})
