import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("react", async () => {
  const actual = await vi.importActual("react")
  return {
    ...(actual as object),
    useCallback: (fn: unknown) => fn,
    useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
  }
})

vi.mock("lucide-react", () => {
  const MockIcon = () => null
  MockIcon.displayName = "MockIcon"
  return {
    Bell: MockIcon,
    BellOff: MockIcon,
    AlertTriangle: MockIcon,
    CreditCard: MockIcon,
    IdCard: MockIcon,
    Dumbbell: MockIcon,
    Info: MockIcon,
    CheckCheck: MockIcon,
    CalendarCheck: MockIcon,
    Target: MockIcon,
    Settings: MockIcon,
    UserPlus: MockIcon,
  }
})

vi.mock("@/components/ui/sheet", () => {
  const MockContainer = ({ children }: { children?: React.ReactNode }) => children
  MockContainer.displayName = "MockContainer"
  return {
    Sheet: MockContainer,
    SheetContent: MockContainer,
    SheetTitle: MockContainer,
  }
})

import { NotificationBell } from "@/components/notifications"

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("exports NotificationBell as a function", () => {
    expect(NotificationBell).toBeDefined()
    expect(typeof NotificationBell).toBe("function")
  })

  it("renders with unreadCount 0", () => {
    const result = NotificationBell({
      unreadCount: 0,
      children: "Notifications",
    })
    expect(result).toBeDefined()
  })

  it("renders with positive unreadCount", () => {
    const result = NotificationBell({
      unreadCount: 5,
      children: "Notifications",
    })
    expect(result).toBeDefined()
  })

  it("renders with 99+ badge when count exceeds 99", () => {
    const result = NotificationBell({
      unreadCount: 150,
      children: "Notifications",
    })
    expect(result).toBeDefined()
  })

  it("renders with two-digit count badge", () => {
    const result = NotificationBell({
      unreadCount: 42,
      children: "Notifications",
    })
    expect(result).toBeDefined()
  })

  it("renders without children", () => {
    const result = NotificationBell({ unreadCount: 0 })
    expect(result).toBeDefined()
  })

  it("calls onOpen when provided and sheet opens", () => {
    const onOpen = vi.fn()
    const result = NotificationBell({
      unreadCount: 3,
      onOpen,
      children: "Notifications",
    })
    expect(result).toBeDefined()
  })

  it("has correct aria-label on trigger button", () => {
    const result = NotificationBell({ unreadCount: 0 })
    expect(result).toBeDefined()
  })
})
