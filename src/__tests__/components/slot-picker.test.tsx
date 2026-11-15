// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse, mockFetch, sentJson } from "./helpers"

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("sonner", () => ({ toast }))

import { SlotPicker } from "@/components/sessions/slot-picker"

const slots = [
  { startsAt: "2026-11-16T14:00:00.000Z", date: "2026-11-16", time: "09:00" },
  { startsAt: "2026-11-16T15:00:00.000Z", date: "2026-11-16", time: "10:00" },
  { startsAt: "2026-11-17T23:00:00.000Z", date: "2026-11-17", time: "18:00" },
]

const mondayAtNine = () =>
  screen.getByRole("button", { name: "Reservar el lunes, 16 de noviembre a las 09:00" })

function renderPicker() {
  return render(<SlotPicker slots={slots} hasAvailability coachName="Ana Coach" />)
}

describe("SlotPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("si el coach no definió su horario, lo explica", () => {
    render(<SlotPicker slots={[]} hasAvailability={false} coachName="Ana Coach" />)

    expect(screen.getByText("Tu coach todavía no definió sus horas de atención.")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("si el coach tiene horario pero no quedan horas, pide volver más tarde", () => {
    render(<SlotPicker slots={[]} hasAvailability coachName="Ana Coach" />)

    expect(
      screen.getByText(
        "Tu coach no tiene horas libres en los próximos días. Vuelve a revisar más tarde."
      )
    ).toBeTruthy()
  })

  it("agrupa las horas por día, con el día escrito en español", () => {
    renderPicker()

    expect(screen.getByText("Cada sesión dura 60 minutos. Elige una hora:")).toBeTruthy()
    const monday = within(screen.getByTestId("slots-2026-11-16"))
    expect(monday.getByText("lunes, 16 de noviembre")).toBeTruthy()
    expect(monday.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "09:00",
      "10:00",
    ])
    const tuesday = within(screen.getByTestId("slots-2026-11-17"))
    expect(tuesday.getByText("martes, 17 de noviembre")).toBeTruthy()
    expect(tuesday.getAllByRole("button").map((button) => button.textContent)).toEqual(["18:00"])
  })

  it("pregunta antes de reservar y no reserva si la persona dice que no", () => {
    const fetchMock = mockFetch()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderPicker()

    fireEvent.click(mondayAtNine())

    expect(confirm).toHaveBeenCalledWith(
      "¿Reservar sesión con Ana Coach el lunes, 16 de noviembre a las 09:00?"
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it("al confirmar, reserva esa hora en la API, avisa y refresca", async () => {
    const fetchMock = mockFetch(jsonResponse({ appointment: { id: "a1" } }, 201))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderPicker()

    fireEvent.click(mondayAtNine())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Sesión reservada"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/appointments")
    expect(fetchMock.mock.calls[0][1].method).toBe("POST")
    expect(sentJson(fetchMock)).toEqual({ startsAt: "2026-11-16T14:00:00.000Z" })
    expect(router.refresh).toHaveBeenCalled()
  })

  it("mientras reserva, deshabilita todas las horas para no reservar dos veces", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {}))
    )
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderPicker()

    fireEvent.click(mondayAtNine())

    await waitFor(() => expect((mondayAtNine() as HTMLButtonElement).disabled).toBe(true))
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[]
    expect(buttons.every((button) => button.disabled)).toBe(true)
  })

  it("si la hora ya se ocupó, muestra el mensaje de la API y refresca las horas", async () => {
    mockFetch(jsonResponse({ error: "Esa hora ya no está disponible" }, 409))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderPicker()

    fireEvent.click(mondayAtNine())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Esa hora ya no está disponible"))
    expect(toast.success).not.toHaveBeenCalled()
    expect(router.refresh).toHaveBeenCalled()
    expect((mondayAtNine() as HTMLButtonElement).disabled).toBe(false)
  })

  it("si no hay conexión, avisa que no se pudo reservar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderPicker()

    fireEvent.click(mondayAtNine())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No se pudo reservar la sesión"))
    await waitFor(() => expect((mondayAtNine() as HTMLButtonElement).disabled).toBe(false))
  })
})
