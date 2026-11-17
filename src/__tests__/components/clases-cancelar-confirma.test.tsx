// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch } from "./helpers"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn() }) }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ClassesView } from "@/components/classes/classes-view"

// Cancelar la reserva de una clase se hacía al primer toque, sin preguntar (las sesiones 1:1 ya
// preguntaban desde #85). En el celular es fácil tocarlo sin querer al desplazarse.
const yoga = {
  id: "yoga",
  name: "Yoga",
  description: null,
  dayOfWeek: "MONDAY",
  startTime: "07:00",
  duration: 60,
  capacity: 10,
  trainerId: "coach",
  trainer: { name: "Ana" },
  confirmedCount: 3,
}

function renderBooked() {
  render(
    <ClassesView
      classes={[yoga]}
      bookings={[{ id: "reserva-1", status: "CONFIRMED", classItem: yoga }]}
      userRole="MEMBER"
      userId="miembro"
    />
  )
}

describe("cancelar la reserva de una clase", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("pregunta antes y no cancela si la persona dice que no", () => {
    const fetchMock = mockFetch()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderBooked()

    fireEvent.click(screen.getByRole("button", { name: /Cancelar reserva/ }))

    expect(confirm).toHaveBeenCalledWith(
      "¿Cancelar tu reserva en Yoga (lunes 07:00)? Tu lugar quedará libre para otra persona."
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText("3/10")).toBeTruthy()
  })

  it("al confirmar, cancela esa reserva y libera el lugar", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderBooked()

    fireEvent.click(screen.getByRole("button", { name: /Cancelar reserva/ }))

    await screen.findByRole("button", { name: "Reservar lugar" })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ bookingId: "reserva-1" }),
      })
    )
    await waitFor(() => expect(screen.getByText("2/10")).toBeTruthy())
  })
})
