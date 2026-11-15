// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { jsonResponse, mockFetch } from "./helpers"

import { ProfilePayments } from "@/components/profile/profile-payments"

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    amount: 100,
    currency: "PEN",
    status: "PENDING",
    method: "CASH",
    type: "MEMBERSHIP",
    reference: null,
    notes: null,
    receiptUrl: null,
    createdAt: "2026-11-10T15:00:00.000Z",
    confirmedAt: null,
    ...overrides,
  }
}

describe("ProfilePayments", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("pide los pagos de la persona con sesión", async () => {
    const fetchMock = mockFetch(jsonResponse({ payments: [] }))
    render(<ProfilePayments />)

    await screen.findByText("Sin pagos registrados")
    expect(fetchMock).toHaveBeenCalledWith("/api/payments/my-payments")
  })

  it("mientras carga no muestra ni la lista vacía ni un error", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {}))
    )
    const { container } = render(<ProfilePayments />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText("Sin pagos registrados")).toBeNull()
    expect(screen.queryByText("Error al cargar pagos")).toBeNull()
  })

  it("sin pagos, lo dice de tú", async () => {
    mockFetch(jsonResponse({ payments: [] }))
    render(<ProfilePayments />)

    expect(await screen.findByText("Sin pagos registrados")).toBeTruthy()
    expect(screen.getByText("No tienes historial de pagos todavía")).toBeTruthy()
  })

  it("si la API responde con error, muestra su mensaje", async () => {
    mockFetch(jsonResponse({ error: "No autorizado" }, 401))
    render(<ProfilePayments />)

    expect(await screen.findByText("Error al cargar pagos")).toBeTruthy()
    expect(screen.getByText("No autorizado")).toBeTruthy()
  })

  it("si no hay conexión, muestra el error en vez de quedarse cargando", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")))
    render(<ProfilePayments />)

    expect(await screen.findByText("Error al cargar pagos")).toBeTruthy()
  })

  it("un pago en efectivo sin confirmar sale como pendiente, con método y monto", async () => {
    mockFetch(jsonResponse({ payments: [payment()] }))
    render(<ProfilePayments />)

    expect(await screen.findByText("Membresía")).toBeTruthy()
    expect(screen.getByText("Pendiente")).toBeTruthy()
    expect(screen.getByText("Efectivo")).toBeTruthy()
    expect(screen.getByText(/S\/\s?100\.00/)).toBeTruthy()
    expect(screen.queryByText(/^Confirmado:/)).toBeNull()
    expect(screen.queryByText(/^Ref:/)).toBeNull()
  })

  it("un pago confirmado muestra la fecha de confirmación y la referencia", async () => {
    mockFetch(
      jsonResponse({
        payments: [
          payment({
            status: "COMPLETED",
            method: "TRANSFER",
            reference: "OP-123",
            confirmedAt: "2026-11-11T16:30:00.000Z",
          }),
        ],
      })
    )
    render(<ProfilePayments />)

    expect(await screen.findByText("Completado")).toBeTruthy()
    expect(screen.getByText("Transferencia")).toBeTruthy()
    expect(screen.getByText("Ref: OP-123")).toBeTruthy()
    expect(screen.getByText(/^Confirmado:/)).toBeTruthy()
  })

  it("un pago rechazado muestra el motivo que escribió el gimnasio", async () => {
    mockFetch(
      jsonResponse({
        payments: [
          payment({ status: "FAILED", method: "YAPE", notes: "El comprobante no se lee" }),
        ],
      })
    )
    render(<ProfilePayments />)

    expect(await screen.findByText("Rechazado")).toBeTruthy()
    expect(screen.getByText("Yape")).toBeTruthy()
    expect(screen.getByText("Motivo/nota: El comprobante no se lee")).toBeTruthy()
  })

  it("muestra todos los pagos que devuelve la API", async () => {
    mockFetch(
      jsonResponse({
        payments: [
          payment({ id: "p1", status: "PENDING" }),
          payment({ id: "p2", status: "COMPLETED", type: "CLASS_BOOKING", amount: 25 }),
          payment({ id: "p3", status: "REFUNDED", amount: 50 }),
        ],
      })
    )
    render(<ProfilePayments />)

    expect(await screen.findByText("Reserva de clase")).toBeTruthy()
    expect(screen.getAllByText("Membresía")).toHaveLength(2)
    expect(screen.getByText("Pendiente")).toBeTruthy()
    expect(screen.getByText("Completado")).toBeTruthy()
    expect(screen.getByText("Reembolsado")).toBeTruthy()
  })
})
