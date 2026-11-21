// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))

vi.mock("sonner", () => ({ toast }))

import { PaymentForm } from "@/components/memberships/payment-form"

const plan = { name: "Plan Mensual", price: 100, currency: "PEN", durationDays: 30 }

function sentForm(fetchMock: ReturnType<typeof vi.fn>): FormData {
  return fetchMock.mock.calls[0][1].body as FormData
}

function attachReceipt(container: HTMLElement, name = "yape.png") {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(["comprobante"], name, { type: "image/png" })
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

describe("PaymentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("muestra el resumen del plan que se va a pagar", () => {
    render(<PaymentForm membershipId="m1" plan={plan} />)

    expect(screen.getByText("Plan Mensual")).toBeTruthy()
    expect(screen.getByText(/S\/\s?100\.00/)).toBeTruthy()
    expect(screen.getByText("30 días")).toBeTruthy()
  })

  it("en efectivo no pide comprobante y explica que se paga en recepción", () => {
    render(<PaymentForm membershipId="m1" plan={plan} />)

    expect(screen.getByText(/Paga en recepción: no necesitas subir comprobante/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Pagaré en recepción" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Subir comprobante/ })).toBeNull()
    expect(screen.queryByLabelText("Referencia de transferencia")).toBeNull()
  })

  it("con Yape muestra a qué número pagar, como lo escribió el gimnasio (#173)", () => {
    render(
      <PaymentForm
        membershipId="m1"
        plan={plan}
        currentPaymentMethod="YAPE"
        paymentInstructions={"Yape: 999 888 777\nA nombre de Gimnasio Centro"}
      />
    )

    expect(screen.getByText("Cómo pagar")).toBeTruthy()
    expect(screen.getByText(/Yape: 999 888 777/)).toBeTruthy()
  })

  it("con transferencia y sin instrucciones dice que pregunte en recepción", () => {
    render(<PaymentForm membershipId="m1" plan={plan} currentPaymentMethod="TRANSFER" />)

    expect(screen.getByText(/aún no publicó a qué número o cuenta pagar/)).toBeTruthy()
  })

  it("en efectivo no muestra instrucciones de pago", () => {
    render(<PaymentForm membershipId="m1" plan={plan} paymentInstructions="Yape: 999 888 777" />)

    expect(screen.queryByText("Cómo pagar")).toBeNull()
  })

  it("con tarjeta tampoco pide comprobante", () => {
    render(<PaymentForm membershipId="m1" plan={plan} currentPaymentMethod="CARD" />)

    expect(screen.getByRole("button", { name: "Pagaré en recepción" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Subir comprobante/ })).toBeNull()
  })

  it("el pago en efectivo se registra sin archivo y queda pendiente de recepción", async () => {
    const fetchMock = mockFetch(jsonResponse({ payment: { id: "p1" } }))
    const onSuccess = vi.fn()
    render(<PaymentForm membershipId="m1" plan={plan} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole("button", { name: "Pagaré en recepción" }))

    expect(await screen.findByText("Pendiente de confirmar en recepción")).toBeTruthy()
    expect(screen.getByText(/se activará cuando el gimnasio confirme/)).toBeTruthy()
    expect(fetchMock.mock.calls[0][0]).toBe("/api/payments/receipt")
    expect(fetchMock.mock.calls[0][1].method).toBe("POST")
    const form = sentForm(fetchMock)
    expect(form.get("method")).toBe("CASH")
    expect(form.get("membershipId")).toBe("m1")
    expect(form.get("file")).toBeNull()
    expect(toast.success).toHaveBeenCalledWith(
      "Listo. Tu pago queda pendiente de confirmar en recepción."
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it("con Yape pide el comprobante y no envía nada si falta", async () => {
    const fetchMock = mockFetch()
    render(<PaymentForm membershipId="m1" plan={plan} currentPaymentMethod="YAPE" />)

    expect(screen.getByRole("button", { name: /Subir comprobante/ })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Adjunta un comprobante para que tu pago pueda ser revisado"
      )
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("con Yape y comprobante, lo envía y avisa que queda pendiente de revisión", async () => {
    const fetchMock = mockFetch(jsonResponse({ payment: { id: "p1" } }))
    const { container } = render(
      <PaymentForm membershipId="m1" plan={plan} currentPaymentMethod="YAPE" />
    )

    const file = attachReceipt(container)
    expect(screen.getByText("yape.png")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }))

    expect(await screen.findByText("Comprobante enviado")).toBeTruthy()
    expect(screen.getByText(/pendiente de revisión/)).toBeTruthy()
    const form = sentForm(fetchMock)
    expect(form.get("method")).toBe("YAPE")
    expect((form.get("file") as File).name).toBe(file.name)
    expect(toast.success).toHaveBeenCalledWith("Comprobante enviado. Pendiente de revisión.")
  })

  it("en transferencia pide la referencia y la envía sin espacios sobrantes", async () => {
    const fetchMock = mockFetch(jsonResponse({ payment: { id: "p1" } }))
    const { container } = render(
      <PaymentForm membershipId="m1" plan={plan} currentPaymentMethod="TRANSFER" />
    )

    fireEvent.change(screen.getByLabelText("Referencia de transferencia"), {
      target: { value: "  OP-123  " },
    })
    attachReceipt(container, "transferencia.png")
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }))

    expect(await screen.findByText("Comprobante enviado")).toBeTruthy()
    const form = sentForm(fetchMock)
    expect(form.get("method")).toBe("TRANSFER")
    expect(form.get("reference")).toBe("OP-123")
  })

  it("si la API falla, muestra su mensaje y deja el formulario para reintentar", async () => {
    mockFetch(jsonResponse({ error: "Ya tienes un pago pendiente para esta membresía" }, 409))
    const onSuccess = vi.fn()
    render(<PaymentForm membershipId="m1" plan={plan} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole("button", { name: "Pagaré en recepción" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Ya tienes un pago pendiente para esta membresía")
    )
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.queryByText("Pendiente de confirmar en recepción")).toBeNull()
    const button = screen.getByRole("button", { name: "Pagaré en recepción" }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it("mientras envía, el botón queda deshabilitado y dice «Procesando...»", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {}))
    )
    render(<PaymentForm membershipId="m1" plan={plan} />)

    fireEvent.click(screen.getByRole("button", { name: "Pagaré en recepción" }))

    const button = await screen.findByRole("button", { name: "Procesando..." })
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })
})
