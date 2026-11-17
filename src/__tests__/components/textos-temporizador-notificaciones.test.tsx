// @vitest-environment jsdom
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect, vi, afterEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

// Issue #172: «01:00 segundos», «Notificaciones» dos veces y el input nativo «Choose File».
vi.mock("framer-motion", () => {
  const MockDiv = "div" as unknown as React.FC<React.ComponentProps<"div">>
  const MockButton = "button" as unknown as React.FC<React.ComponentProps<"button">>
  const MockPresence = ({ children }: { children?: React.ReactNode }) => children
  return { motion: { div: MockDiv, button: MockButton }, AnimatePresence: MockPresence }
})

import { NotificationList } from "@/components/notifications"

const leer = (archivo: string) => readFileSync(path.join(process.cwd(), archivo), "utf8")
const una = [
  {
    id: "1",
    title: "Pago confirmado",
    message: "Tu pago fue confirmado",
    type: "PAYMENT" as const,
    read: false,
    createdAt: new Date().toISOString(),
  },
]
const noop = () => {}

afterEach(cleanup)

describe("NotificationList", () => {
  it("en la hoja de la campana muestra el título", () => {
    render(<NotificationList notifications={una} onMarkRead={noop} onMarkAllRead={noop} />)
    expect(screen.getByRole("heading", { name: "Notificaciones" })).toBeTruthy()
  })

  it("con showTitle={false} no repite el título, pero deja «Marcar todas leídas»", () => {
    render(
      <NotificationList
        notifications={una}
        onMarkRead={noop}
        onMarkAllRead={noop}
        showTitle={false}
      />
    )
    expect(screen.queryByRole("heading", { name: "Notificaciones" })).toBeNull()
    expect(screen.getByRole("button", { name: /Marcar todas leídas/ })).toBeTruthy()
  })

  it("la página /notifications usa showTitle={false}", () => {
    expect(leer("src/app/notifications/page.tsx")).toMatch(/showTitle=\{false\}/)
  })
})

describe("temporizador", () => {
  it("no dice «segundos» debajo de mm:ss", () => {
    expect(leer("src/app/timer/page.tsx")).not.toMatch(/>segundos</)
  })
})

describe("membresía nueva", () => {
  it("el comprobante se sube con un botón en español, no con el input nativo visible", () => {
    const src = leer("src/app/membresia/membresia-content.tsx")
    expect(src).toMatch(/Subir comprobante/)
    expect(src).toMatch(/id="newPaymentReceipt"[\s\S]{0,120}className="sr-only"/)
  })
})
