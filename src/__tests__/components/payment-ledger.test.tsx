// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { PaymentLedger, type PaymentRow } from "@/components/admin/payment-ledger"

function row(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: "p1",
    userName: "Carlos Miembro",
    userEmail: "carlos@example.com",
    amount: 100,
    currency: "PEN",
    status: "PENDING",
    method: "CASH",
    reference: null,
    receiptUrl: null,
    createdAt: "2026-11-10T15:00:00.000Z",
    confirmedByName: null,
    ...overrides,
  }
}

const payments: PaymentRow[] = [
  row(),
  row({
    id: "p2",
    userName: "Laura Nueva",
    userEmail: "laura@example.com",
    status: "COMPLETED",
    method: "TRANSFER",
    reference: "OP-777",
    receiptUrl: "/api/files/receipts/op-777.png",
    confirmedByName: "Ana Coach",
    amount: 250,
  }),
  row({
    id: "p3",
    userName: null,
    userEmail: "sin-nombre@example.com",
    status: "FAILED",
    method: "YAPE",
    amount: 30,
  }),
]

const search = () => screen.getByPlaceholderText("Buscar por miembro o referencia...")

describe("PaymentLedger", () => {
  it("lista los pagos con miembro, método, monto y estado", () => {
    render(<PaymentLedger payments={payments} />)

    expect(screen.getByText("Carlos Miembro")).toBeTruthy()
    expect(screen.getByText("Laura Nueva")).toBeTruthy()
    expect(screen.getByText(/S\/\s?250\.00/)).toBeTruthy()
    expect(screen.getByText(/Transferencia · OP-777/)).toBeTruthy()
    expect(screen.getByText("Confirmado por Ana Coach")).toBeTruthy()
  })

  it("si el miembro no tiene nombre, muestra su correo", () => {
    render(<PaymentLedger payments={payments} />)

    expect(screen.getByText("sin-nombre@example.com")).toBeTruthy()
  })

  it("el enlace «Ver comprobante» solo sale en los pagos que tienen comprobante", () => {
    render(<PaymentLedger payments={payments} />)

    const links = screen.getAllByRole("link", { name: /Ver comprobante/ })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe("/api/files/receipts/op-777.png")
    expect(links[0].getAttribute("target")).toBe("_blank")
  })

  it("sin pagos, lo dice", () => {
    render(<PaymentLedger payments={[]} />)

    expect(screen.getByText("No hay pagos que coincidan")).toBeTruthy()
  })

  it("filtra por estado y «Todos» vuelve a mostrar la lista completa", () => {
    render(<PaymentLedger payments={payments} />)

    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }))
    expect(screen.getByText("Carlos Miembro")).toBeTruthy()
    expect(screen.queryByText("Laura Nueva")).toBeNull()
    expect(screen.queryByText("sin-nombre@example.com")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Completado" }))
    expect(screen.getByText("Laura Nueva")).toBeTruthy()
    expect(screen.queryByText("Carlos Miembro")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Todos" }))
    expect(screen.getByText("Carlos Miembro")).toBeTruthy()
    expect(screen.getByText("Laura Nueva")).toBeTruthy()
    expect(screen.getByText("sin-nombre@example.com")).toBeTruthy()
  })

  it("busca por nombre, correo o referencia, sin distinguir mayúsculas", () => {
    render(<PaymentLedger payments={payments} />)

    fireEvent.change(search(), { target: { value: "LAURA" } })
    expect(screen.getByText("Laura Nueva")).toBeTruthy()
    expect(screen.queryByText("Carlos Miembro")).toBeNull()

    fireEvent.change(search(), { target: { value: "sin-nombre@" } })
    expect(screen.getByText("sin-nombre@example.com")).toBeTruthy()
    expect(screen.queryByText("Laura Nueva")).toBeNull()

    fireEvent.change(search(), { target: { value: "op-777" } })
    expect(screen.getByText("Laura Nueva")).toBeTruthy()
    expect(screen.queryByText("Carlos Miembro")).toBeNull()
  })

  it("combina búsqueda y estado, y avisa cuando nada coincide", () => {
    render(<PaymentLedger payments={payments} />)

    fireEvent.change(search(), { target: { value: "laura" } })
    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }))

    expect(screen.getByText("No hay pagos que coincidan")).toBeTruthy()
    expect(screen.queryByText("Laura Nueva")).toBeNull()
  })
})
