// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch, sentJson } from "./helpers"

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("sonner", () => ({ toast }))

import { MembershipCard } from "@/components/memberships/membership-card"

const DAY = 24 * 60 * 60 * 1000

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: "m1",
    plan: { name: "Plan Mensual", price: 100, currency: "PEN", durationDays: 30 },
    planPrice: 80,
    planCurrency: "PEN",
    planDurationDays: 30,
    gym: { name: "Fitness Total" },
    coach: { name: "Ana Coach" },
    status: "ACTIVE",
    startDate: new Date(Date.now() - 10 * DAY).toISOString(),
    endDate: new Date(Date.now() + 20 * DAY).toISOString(),
    paymentConfirmed: true,
    paymentMethod: "CASH",
    paymentRef: null,
    autoRenew: false,
    ...overrides,
  }
}

const expired = { endDate: new Date(Date.now() - 2 * DAY).toISOString() }

describe("MembershipCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("muestra una membresía activa y pagada, sin botón de renovar", () => {
    render(<MembershipCard membership={membership()} />)

    expect(screen.getByText("Plan Mensual")).toBeTruthy()
    expect(screen.getByText("Activa")).toBeTruthy()
    expect(screen.getByText("Pagado")).toBeTruthy()
    expect(screen.getByText("Fitness Total")).toBeTruthy()
    expect(screen.getByText("Ana Coach")).toBeTruthy()
    expect(screen.getByText("Efectivo")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Renovar" })).toBeNull()
  })

  it("cobra el precio con el que se contrató, no el precio actual del plan", () => {
    render(<MembershipCard membership={membership()} />)

    expect(screen.getByText(/S\/\s?80\.00/)).toBeTruthy()
    expect(screen.queryByText(/S\/\s?100\.00/)).toBeNull()
    expect(screen.getByText("/ 30 días")).toBeTruthy()
  })

  it("usa el precio del plan cuando la membresía no guardó el suyo", () => {
    render(<MembershipCard membership={membership({ planPrice: null })} />)

    expect(screen.getByText(/S\/\s?100\.00/)).toBeTruthy()
  })

  it("dice que falta gimnasio o coach cuando no están asignados", () => {
    render(<MembershipCard membership={membership({ gym: null, coach: null })} />)

    expect(screen.getByText("Gimnasio no asignado")).toBeTruthy()
    expect(screen.getByText("Sin coach asignado")).toBeTruthy()
  })

  it("una membresía activa sin pago confirmado sale como «Pago pendiente»", () => {
    render(<MembershipCard membership={membership({ paymentConfirmed: false })} />)

    // Una vez en el estado de la membresía y otra en el estado del pago.
    expect(screen.getAllByText("Pago pendiente")).toHaveLength(2)
    expect(screen.queryByText("Activa")).toBeNull()
    expect(screen.queryByText("Pagado")).toBeNull()
    expect(screen.queryByRole("button", { name: "Renovar" })).toBeNull()
  })

  it("una membresía activa con la fecha pasada sale como «Vencida» y se puede renovar", () => {
    render(<MembershipCard membership={membership(expired)} />)

    expect(screen.getByText("Vencida")).toBeTruthy()
    expect(screen.queryByText("Activa")).toBeNull()
    expect(screen.getByRole("button", { name: "Renovar" })).toBeTruthy()
  })

  it("muestra la referencia del pago y la auto-renovación solo cuando existen", () => {
    const { unmount } = render(<MembershipCard membership={membership()} />)
    expect(screen.queryByText(/^Ref:/)).toBeNull()
    expect(screen.queryByText("Auto-renovación")).toBeNull()
    unmount()

    render(
      <MembershipCard
        membership={membership({
          paymentMethod: "TRANSFER",
          paymentRef: "OP-123",
          autoRenew: true,
        })}
      />
    )
    expect(screen.getByText("Transferencia")).toBeTruthy()
    expect(screen.getByText("Ref: OP-123")).toBeTruthy()
    expect(screen.getByText("Auto-renovación")).toBeTruthy()
  })

  it("renovar llama a la API y avisa que falta confirmar el pago", async () => {
    const fetchMock = mockFetch(jsonResponse({ membership: {} }))
    render(<MembershipCard membership={membership(expired)} />)

    fireEvent.click(screen.getByRole("button", { name: "Renovar" }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Membresía renovada. Confirma tu pago.")
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("/api/memberships/m1")
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH")
    expect(sentJson(fetchMock)).toEqual({ renew: true })
    expect(router.refresh).toHaveBeenCalled()
  })

  it("mientras renueva, el botón queda deshabilitado y dice «Renovando...»", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal("fetch", fetchMock)
    render(<MembershipCard membership={membership(expired)} />)

    fireEvent.click(screen.getByRole("button", { name: "Renovar" }))

    const button = await screen.findByRole("button", { name: "Renovando..." })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it("si el precio cambió, pregunta antes y no renueva si la persona no acepta", async () => {
    const fetchMock = mockFetch(
      jsonResponse(
        {
          code: "PRICE_CHANGED",
          current: {
            price: 120,
            currency: "PEN",
            durationDays: 30,
            previousPrice: 80,
            previousCurrency: "PEN",
          },
        },
        409
      )
    )
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(<MembershipCard membership={membership(expired)} />)

    fireEvent.click(screen.getByRole("button", { name: "Renovar" }))

    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        "No se renovó. Tu membresía vence en la fecha actual."
      )
    )
    expect(confirm.mock.calls[0][0]).toContain("PEN 120.00 por 30 días")
    expect(confirm.mock.calls[0][0]).toContain("antes PEN 80.00")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it("si la persona acepta el precio nuevo, renueva con ese precio", async () => {
    const fetchMock = mockFetch(
      jsonResponse(
        {
          code: "PRICE_CHANGED",
          current: {
            price: 120,
            currency: "PEN",
            durationDays: 30,
            previousPrice: 80,
            previousCurrency: "PEN",
          },
        },
        409
      ),
      jsonResponse({ membership: {} })
    )
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<MembershipCard membership={membership(expired)} />)

    fireEvent.click(screen.getByRole("button", { name: "Renovar" }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Membresía renovada con el nuevo precio. Confirma tu pago."
      )
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sentJson(fetchMock, 1)).toEqual({ renew: true, acceptNewPrice: true })
    expect(router.refresh).toHaveBeenCalled()
  })

  it("si la API rechaza la renovación, muestra su mensaje y deja reintentar", async () => {
    mockFetch(jsonResponse({ error: "Esta membresía no se puede renovar" }, 400))
    render(<MembershipCard membership={membership(expired)} />)

    fireEvent.click(screen.getByRole("button", { name: "Renovar" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Esta membresía no se puede renovar")
    )
    expect(router.refresh).not.toHaveBeenCalled()
    const button = screen.getByRole("button", { name: "Renovar" }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })
})
