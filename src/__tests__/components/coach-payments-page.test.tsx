// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { jsonResponse, mockFetch, sentJson } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
// El menú de la app (sesión, notificaciones en vivo) no es parte de esta pantalla.
vi.mock("@/components/layout/shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

import CoachPaymentsPage from "@/app/coach/payments/page"

const yape = {
  id: "pago-yape",
  amount: 120,
  currency: "PEN",
  status: "PENDING",
  method: "YAPE",
  receiptUrl: "https://cdn.example.com/yape.jpg",
  reference: "OP-777",
  notes: "Pagó la mensualidad de noviembre",
  type: "MEMBERSHIP",
  createdAt: "2026-11-10T15:30:00.000Z",
  user: { id: "u-1", name: "Laura Pérez", email: "laura@example.com" },
  membership: {
    id: "m-1",
    startDate: "2026-11-01T12:00:00.000Z",
    endDate: "2026-12-01T12:00:00.000Z",
    plan: { name: "Mensual" },
  },
}

const cash = {
  ...yape,
  id: "pago-efectivo",
  amount: 15,
  method: "CASH",
  receiptUrl: null,
  reference: null,
  notes: null,
  type: "CLASS_BOOKING",
  user: { id: "u-2", name: null, email: "carlos@example.com" },
  membership: null,
}

function cardOf(text: string) {
  const card = screen.getByText(text).closest('[data-slot="card"]')
  if (!card) throw new Error(`No hay tarjeta para ${text}`)
  return within(card as HTMLElement)
}

async function renderWith(payments: unknown[], ...more: Response[]) {
  const fetchMock = mockFetch(jsonResponse({ payments }), ...more)
  render(<CoachPaymentsPage />)
  await screen.findByRole("heading", { name: "Comprobantes" })
  return fetchMock
}

describe("Comprobantes del coach (/coach/payments)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("mientras carga no muestra la bandeja, y después pide los pagos pendientes", async () => {
    const fetchMock = mockFetch(jsonResponse({ payments: [] }))
    render(<CoachPaymentsPage />)

    expect(screen.queryByRole("heading", { name: "Comprobantes" })).toBeNull()
    expect(await screen.findByRole("heading", { name: "Comprobantes" })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith("/api/payments/pending")
  })

  it("sin pagos pendientes lo dice", async () => {
    await renderWith([])

    expect(screen.getByText("No hay pagos pendientes")).toBeTruthy()
  })

  it("si no carga, avisa y muestra la bandeja vacía", async () => {
    mockFetch(jsonResponse({ error: "No autorizado" }, 403))
    render(<CoachPaymentsPage />)

    await screen.findByText("No hay pagos pendientes")
    expect(toast.error).toHaveBeenCalledWith("Error al cargar pagos")
  })

  it("la tarjeta con comprobante muestra socio, monto, método, tipo, referencia, nota y plan", async () => {
    await renderWith([yape])

    const card = cardOf("Laura Pérez")
    expect(card.getByText("laura@example.com")).toBeTruthy()
    expect(card.getByText(/S\/\s?120\.00/)).toBeTruthy()
    expect(card.getByText("Yape")).toBeTruthy()
    expect(card.getByText("Membresía")).toBeTruthy()
    expect(card.getByText("Ref. OP-777")).toBeTruthy()
    expect(card.getByText("Nota: Pagó la mensualidad de noviembre")).toBeTruthy()
    expect(card.getByText(/^Mensual ·/)).toBeTruthy()
    expect(card.getByAltText("Comprobante de pago")).toBeTruthy()
  })

  it("un pago en efectivo no trae captura y explica que se confirma al recibir el dinero", async () => {
    await renderWith([cash])

    const card = cardOf("Sin nombre")
    expect(card.getByText("Efectivo")).toBeTruthy()
    expect(card.getByText("Reserva de clase")).toBeTruthy()
    expect(card.getByText("Pago en recepción: confírmalo cuando recibas el dinero")).toBeTruthy()
    expect(card.queryByRole("button", { name: /Ampliar comprobante/ })).toBeNull()
  })

  it("un pago por transferencia sin captura dice «Sin comprobante»", async () => {
    await renderWith([{ ...yape, method: "TRANSFER", receiptUrl: null }])

    expect(cardOf("Laura Pérez").getByText("Sin comprobante")).toBeTruthy()
  })

  it("«Ampliar comprobante» abre la captura en un diálogo que se cierra con «Cerrar»", async () => {
    await renderWith([yape])

    fireEvent.click(screen.getByRole("button", { name: /Ampliar comprobante/ }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: "Comprobante de pago" })).toBeTruthy()
    expect(within(dialog).getByAltText("Comprobante de pago").getAttribute("src")).toBe(
      yape.receiptUrl
    )

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("confirmar el pago lo quita de la bandeja", async () => {
    const fetchMock = await renderWith([yape, cash], jsonResponse({ ok: true }))

    fireEvent.click(cardOf("Laura Pérez").getByRole("button", { name: /Confirmar pago/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pago confirmado"))
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/payments/pago-yape",
      expect.objectContaining({ method: "PUT" })
    )
    expect(sentJson(fetchMock, 1)).toEqual({ action: "CONFIRM" })
    expect(screen.queryByText("Laura Pérez")).toBeNull()
    expect(screen.getByText("Sin nombre")).toBeTruthy()
  })

  it("si la API no deja confirmar, avisa y el pago sigue en la bandeja", async () => {
    await renderWith([yape], jsonResponse({ error: "Ya procesado" }, 409))

    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error al confirmar"))
    expect(screen.getByText("Laura Pérez")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Confirmar pago/ })).toHaveProperty("disabled", false)
  })

  it("si se cae la conexión al confirmar, avisa «Error de conexión»", async () => {
    const fetchMock = await renderWith([yape])
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    fireEvent.click(screen.getByRole("button", { name: /Confirmar pago/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error de conexión"))
    expect(screen.getByText("Laura Pérez")).toBeTruthy()
  })

  it("rechazar pide el motivo; si se cancela, no hace nada", async () => {
    const fetchMock = await renderWith([yape])
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null)

    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }))

    expect(prompt).toHaveBeenCalledWith("Motivo del rechazo", "Comprobante ilegible")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Laura Pérez")).toBeTruthy()
  })

  it("un motivo en blanco tampoco rechaza", async () => {
    const fetchMock = await renderWith([yape])
    vi.spyOn(window, "prompt").mockReturnValue("   ")

    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rechazar con motivo lo envía sin espacios y quita el pago", async () => {
    const fetchMock = await renderWith([cash], jsonResponse({ ok: true }))
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("  No llegó a recepción  ")

    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }))

    // Sin captura, el motivo sugerido es otro.
    expect(prompt).toHaveBeenCalledWith("Motivo del rechazo", "No se recibió el pago en recepción")
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pago rechazado"))
    expect(sentJson(fetchMock, 1)).toEqual({ action: "REJECT", notes: "No llegó a recepción" })
    expect(screen.getByText("No hay pagos pendientes")).toBeTruthy()
  })

  it("si la API no deja rechazar, avisa y el pago sigue", async () => {
    await renderWith([yape], jsonResponse({ error: "x" }, 500))
    vi.spyOn(window, "prompt").mockReturnValue("Comprobante ilegible")

    fireEvent.click(screen.getByRole("button", { name: /Rechazar/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Error al rechazar"))
    expect(screen.getByText("Laura Pérez")).toBeTruthy()
  })

  it.todo(
    "al fallar confirmar o rechazar, mostrar el motivo que da la API " +
      "(hoy siempre dice «Error al confirmar» o «Error al rechazar» y descarta `error` de la " +
      "respuesta, a diferencia del panel de membresías del admin; coach/payments/page.tsx:65 y :94)"
  )
})
