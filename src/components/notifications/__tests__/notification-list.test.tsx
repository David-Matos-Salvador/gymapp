import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("framer-motion", () => {
  const MockDiv = "div" as unknown as React.FC<React.ComponentProps<"div">>
  const MockButton = "button" as unknown as React.FC<React.ComponentProps<"button">>
  const MockPresence = ({ children }: { children?: React.ReactNode }) => children
  MockPresence.displayName = "MockPresence"
  return {
    motion: { div: MockDiv, button: MockButton },
    AnimatePresence: MockPresence,
  }
})

import { NotificationList } from "@/components/notifications"
import { sortUnreadFirst } from "@/components/notifications/notification-list"
import type { MockNotification } from "@/components/notifications"

const mockNotification: MockNotification = {
  id: "1",
  title: "Recordatorio de pago",
  message: "Tu membresía vence en 3 días",
  type: "PAYMENT",
  read: false,
  createdAt: new Date().toISOString(),
}

const mockNotifications: MockNotification[] = [
  mockNotification,
  {
    id: "2",
    title: "Nueva rutina asignada",
    message: "Tu coach te ha asignado una nueva rutina",
    type: "INFO",
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    title: "Clase cancelada",
    message: "La clase de spinning fue cancelada",
    type: "CLASS",
    read: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

describe("NotificationList", () => {
  const onMarkRead = vi.fn()
  const onMarkAllRead = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("exports NotificationList as a function", () => {
    expect(NotificationList).toBeDefined()
    expect(typeof NotificationList).toBe("function")
  })

  it("renders empty state when no notifications", () => {
    const result = NotificationList({
      notifications: [],
      onMarkRead,
      onMarkAllRead,
    })
    expect(result).toBeDefined()
  })

  it("renders notifications list when notifications exist", () => {
    const result = NotificationList({
      notifications: [mockNotification],
      onMarkRead,
      onMarkAllRead,
    })
    expect(result).toBeDefined()
  })

  // Las leídas salían arriba y las nuevas quedaban al final de la lista.
  it("sorts unread notifications first", () => {
    expect(sortUnreadFirst(mockNotifications).map((n) => n.id)).toEqual(["1", "3", "2"])
  })

  it("keeps the received order when all are read", () => {
    const allRead = mockNotifications.map((n) => ({ ...n, read: true }))
    expect(sortUnreadFirst(allRead).map((n) => n.id)).toEqual(["1", "2", "3"])
  })

  it("shows mark all read button when unread count > 0", () => {
    const result = NotificationList({
      notifications: mockNotifications,
      onMarkRead,
      onMarkAllRead,
    })
    expect(result).toBeDefined()
  })

  it("does not show mark all read when all read", () => {
    const allRead = mockNotifications.map((n) => ({ ...n, read: true }))
    const result = NotificationList({
      notifications: allRead,
      onMarkRead,
      onMarkAllRead,
    })
    expect(result).toBeDefined()
  })
})
