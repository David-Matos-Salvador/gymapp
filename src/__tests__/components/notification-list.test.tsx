// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("framer-motion", () => {
  const MockDiv = "div" as unknown as React.FC<React.ComponentProps<"div">>
  // Sin las props de animación, que el DOM no conoce.
  const MockButton = (props: React.ComponentProps<"button"> & Record<string, unknown>) => {
    const domProps = { ...props }
    for (const key of ["initial", "animate", "exit", "transition"]) delete domProps[key]
    return <button {...domProps} />
  }
  const MockPresence = ({ children }: { children?: React.ReactNode }) => children
  return { motion: { div: MockDiv, button: MockButton }, AnimatePresence: MockPresence }
})

import { NotificationList, type MockNotification } from "@/components/notifications"
import { sortUnreadFirst } from "@/components/notifications/notification-list"

const NOW = new Date("2026-11-21T15:00:00.000Z")
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

function notification(over: Partial<MockNotification> = {}): MockNotification {
  return {
    id: "n1",
    title: "Pago confirmado",
    message: "Tu pago de S/ 100.00 fue confirmado",
    type: "PAYMENT",
    read: false,
    createdAt: ago(5 * MIN),
    ...over,
  }
}

const list: MockNotification[] = [
  notification({ id: "a", title: "Rutina nueva", type: "INFO", read: true }),
  notification({ id: "b", title: "Pago confirmado", type: "PAYMENT" }),
  notification({ id: "c", title: "Clase cancelada", type: "CLASS", read: true }),
  notification({ id: "d", title: "Solicitud de coach", type: "TRAINER_REQUEST" }),
]

function renderList(
  notifications: MockNotification[] = list,
  props: Partial<React.ComponentProps<typeof NotificationList>> = {}
) {
  const handlers = { onMarkRead: vi.fn(), onMarkAllRead: vi.fn(), onNavigate: vi.fn() }
  render(<NotificationList notifications={notifications} {...handlers} {...props} />)
  return handlers
}

/** Cada notificación es un botón; se busca por su título. */
function item(title: string) {
  return screen.getByText(title).closest("button") as HTMLButtonElement
}

describe("NotificationList", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("sin notificaciones", () => {
    it("dice que no tienes notificaciones y dónde aparecerán", () => {
      renderList([])

      expect(screen.getByText("No tienes notificaciones")).toBeTruthy()
      expect(screen.getByText("Cuando tengas notificaciones, aparecerán aquí.")).toBeTruthy()
    })

    it("no ofrece «Marcar todas leídas» ni botones de notificación", () => {
      renderList([])

      expect(screen.queryAllByRole("button")).toHaveLength(0)
    })
  })

  describe("con notificaciones", () => {
    it("muestra el título «Notificaciones» como encabezado", () => {
      renderList()

      expect(screen.getByRole("heading", { name: "Notificaciones" })).toBeTruthy()
    })

    it("muestra el título y el mensaje de cada una", () => {
      renderList([notification()])

      const button = item("Pago confirmado")
      expect(within(button).getByText("Tu pago de S/ 100.00 fue confirmado")).toBeTruthy()
    })

    it("pone las no leídas arriba y respeta el orden dentro de cada grupo", () => {
      renderList()

      const titles = screen
        .getAllByRole("button")
        .filter((b) => !b.textContent?.includes("Marcar todas"))
        .map((b) => b.querySelector("p")?.textContent)
      expect(titles).toEqual([
        "Pago confirmado",
        "Solicitud de coach",
        "Rutina nueva",
        "Clase cancelada",
      ])
    })

    it("las no leídas llevan el título en negrita y un punto; las leídas no", () => {
      renderList()

      const unread = item("Pago confirmado")
      const read = item("Rutina nueva")
      expect(within(unread).getByText("Pago confirmado").className).toContain("font-semibold")
      expect(unread.querySelector("span.rounded-full")).not.toBeNull()
      expect(within(read).getByText("Rutina nueva").className).not.toContain("font-semibold")
      expect(read.querySelector("span.rounded-full")).toBeNull()
    })

    it("todos los tipos se pueden mostrar con su icono", () => {
      const types: MockNotification["type"][] = [
        "INFO",
        "WARNING",
        "REMINDER",
        "PAYMENT",
        "MEMBERSHIP",
        "CLASS",
        "CHECK_IN",
        "GOAL",
        "SYSTEM",
        "TRAINER_REQUEST",
      ]
      renderList(types.map((type, i) => notification({ id: type, title: `Aviso ${i}`, type })))

      for (let i = 0; i < types.length; i++) {
        expect(item(`Aviso ${i}`).querySelector("svg")).not.toBeNull()
      }
    })

    it("cada notificación es un botón (se puede usar con teclado)", () => {
      renderList([notification()])

      expect(item("Pago confirmado").getAttribute("type")).toBe("button")
    })
  })

  describe("«Marcar todas leídas»", () => {
    it("aparece si hay no leídas y llama a onMarkAllRead", () => {
      const handlers = renderList()

      fireEvent.click(screen.getByRole("button", { name: "Marcar todas leídas" }))

      expect(handlers.onMarkAllRead).toHaveBeenCalledTimes(1)
      expect(handlers.onMarkRead).not.toHaveBeenCalled()
    })

    it("no aparece si todas están leídas", () => {
      renderList(list.map((n) => ({ ...n, read: true })))

      expect(screen.queryByRole("button", { name: /Marcar todas/ })).toBeNull()
    })

    it("con showTitle={false} queda sin el encabezado repetido", () => {
      renderList(list, { showTitle: false })

      expect(screen.queryByRole("heading")).toBeNull()
      expect(screen.getByRole("button", { name: "Marcar todas leídas" })).toBeTruthy()
    })
  })

  describe("al tocar una notificación", () => {
    it("la marca como leída", () => {
      const handlers = renderList()

      fireEvent.click(item("Clase cancelada"))

      expect(handlers.onMarkRead).toHaveBeenCalledWith("c")
    })

    it.each([
      ["Pago confirmado", "b"],
      ["Solicitud de coach", "d"],
    ])("«%s» además lleva a su pantalla", (title, id) => {
      const handlers = renderList()

      fireEvent.click(item(title))

      expect(handlers.onMarkRead).toHaveBeenCalledWith(id)
      expect(handlers.onNavigate).toHaveBeenCalledWith(expect.objectContaining({ id }))
    })

    it("las de otros tipos no navegan", () => {
      const handlers = renderList()

      fireEvent.click(item("Rutina nueva"))
      fireEvent.click(item("Clase cancelada"))

      expect(handlers.onNavigate).not.toHaveBeenCalled()
    })

    it("sin onNavigate, tocar un pago solo la marca como leída", () => {
      const onMarkRead = vi.fn()
      render(
        <NotificationList
          notifications={[notification()]}
          onMarkRead={onMarkRead}
          onMarkAllRead={vi.fn()}
        />
      )

      fireEvent.click(item("Pago confirmado"))

      expect(onMarkRead).toHaveBeenCalledWith("n1")
    })
  })

  describe("hace cuánto", () => {
    it.each([
      [30 * 1000, "ahora"],
      [5 * MIN, "hace 5m"],
      [59 * MIN, "hace 59m"],
      [3 * HOUR, "hace 3h"],
      [2 * DAY, "hace 2d"],
      [6 * DAY, "hace 6d"],
    ])("a %i ms dice «%s»", (ms, text) => {
      renderList([notification({ createdAt: ago(ms) })])

      expect(screen.getByText(text)).toBeTruthy()
    })

    it.todo(
      "desde una semana debería decir «hace 1 sem» o «hace 1 semana»: hoy sale «hace 1sem», pegado"
    )

    it.todo(
      "desde 30 días debería decir «hace 1 mes» / «hace 2 meses»: hoy sale «hace 1mes» y «hace 2mes», sin espacio ni plural"
    )
  })

  describe("sortUnreadFirst", () => {
    it("pone las no leídas primero sin desordenar cada grupo", () => {
      expect(sortUnreadFirst(list).map((n) => n.id)).toEqual(["b", "d", "a", "c"])
    })

    it("respeta el orden recibido si todas están leídas", () => {
      const allRead = list.map((n) => ({ ...n, read: true }))
      expect(sortUnreadFirst(allRead).map((n) => n.id)).toEqual(["a", "b", "c", "d"])
    })

    it("no cambia la lista original", () => {
      const copy = [...list]
      sortUnreadFirst(list)
      expect(list).toEqual(copy)
    })
  })

  it.todo(
    "una notificación sin leer debería anunciarse como tal a un lector de pantalla: el punto amarillo es solo visual y no tiene texto (por ejemplo «Sin leer»)"
  )
})
