// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch, sentJson } from "./helpers"

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("sonner", () => ({ toast }))

import { AppointmentList, type AppointmentItem } from "@/components/sessions/appointment-list"

const appointments: AppointmentItem[] = [
  { id: "a1", when: "lunes 16 de noviembre, 09:00", withName: "Ana Coach", durationMinutes: 60 },
  { id: "a2", when: "martes 17 de noviembre, 18:00", withName: "Ana Coach", durationMinutes: 60 },
]

const cancelFirst = () =>
  screen.getByRole("button", { name: "Cancelar la sesión del lunes 16 de noviembre, 09:00" })

describe("AppointmentList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sin sesiones, muestra el mensaje que le pasa la página", () => {
    render(<AppointmentList appointments={[]} emptyMessage="No tienes sesiones reservadas." />)

    expect(screen.getByText("No tienes sesiones reservadas.")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("muestra cuándo es cada sesión, con quién y cuánto dura", () => {
    render(<AppointmentList appointments={appointments} emptyMessage="Sin sesiones" />)

    expect(screen.getByText("lunes 16 de noviembre, 09:00")).toBeTruthy()
    expect(screen.getByText("martes 17 de noviembre, 18:00")).toBeTruthy()
    expect(screen.getAllByText("Con Ana Coach · 60 min")).toHaveLength(2)
    expect(screen.queryByText("Sin sesiones")).toBeNull()
  })

  it("cada botón de cancelar dice qué sesión cancela", () => {
    render(<AppointmentList appointments={appointments} emptyMessage="Sin sesiones" />)

    expect(cancelFirst()).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Cancelar la sesión del martes 17 de noviembre, 18:00" })
    ).toBeTruthy()
  })

  it("pregunta antes de cancelar y no hace nada si la persona dice que no", () => {
    const fetchMock = mockFetch()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(<AppointmentList appointments={appointments} emptyMessage="Sin sesiones" />)

    fireEvent.click(cancelFirst())

    expect(confirm).toHaveBeenCalledWith(
      "¿Cancelar la sesión del lunes 16 de noviembre, 09:00 con Ana Coach? Se le avisará."
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("al confirmar, cancela esa sesión en la API, avisa y refresca la lista", async () => {
    const fetchMock = mockFetch(jsonResponse({ appointment: { id: "a1" } }))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<AppointmentList appointments={appointments} emptyMessage="Sin sesiones" />)

    fireEvent.click(cancelFirst())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Sesión cancelada"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/appointments/a1")
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH")
    expect(sentJson(fetchMock)).toEqual({ status: "CANCELLED" })
    expect(router.refresh).toHaveBeenCalled()
  })

  it("mientras cancela, solo se deshabilita el botón de esa sesión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {}))
    )
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<AppointmentList appointments={appointments} emptyMessage="Sin sesiones" />)

    fireEvent.click(cancelFirst())

    await waitFor(() => expect((cancelFirst() as HTMLButtonElement).disabled).toBe(true))
    const other = screen.getByRole("button", {
      name: "Cancelar la sesión del martes 17 de noviembre, 18:00",
    }) as HTMLButtonElement
    expect(other.disabled).toBe(false)
    // #138: el botón muestra que está trabajando.
    expect(cancelFirst().querySelector(".animate-spin")).not.toBeNull()
    expect(other.querySelector(".animate-spin")).toBeNull()
  })

  it("si la API no deja cancelar, muestra su mensaje y no refresca", async () => {
    mockFetch(jsonResponse({ error: "Solo puedes cancelar con 2 horas de anticipación" }, 409))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<AppointmentList appointments={appointments} emptyMessage="Sin sesiones" />)

    fireEvent.click(cancelFirst())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Solo puedes cancelar con 2 horas de anticipación")
    )
    expect(router.refresh).not.toHaveBeenCalled()
    expect((cancelFirst() as HTMLButtonElement).disabled).toBe(false)
  })

  it("si no hay conexión, avisa que no se pudo cancelar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<AppointmentList appointments={appointments} emptyMessage="Sin sesiones" />)

    fireEvent.click(cancelFirst())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No se pudo cancelar la sesión"))
    expect(router.refresh).not.toHaveBeenCalled()
  })
})
