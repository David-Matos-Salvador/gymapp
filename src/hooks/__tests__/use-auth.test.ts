import { describe, it, expect, vi, beforeEach } from "vitest"
import { useSession } from "next-auth/react"
import { useAuth } from "../use-auth"

vi.mock("next-auth/react")

describe("useAuth", () => {
  const mockUseSession = vi.mocked(useSession)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns isAuthenticated=true and user when session is authenticated", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "1", name: "John", email: "john@test.com", role: "MEMBER" },
      },
      status: "authenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.isAuthenticated).toBe(true)
    expect(result.isLoading).toBe(false)
    expect(result.user).toBeDefined()
    expect(result.user?.name).toBe("John")
    expect(result.user?.email).toBe("john@test.com")
    expect(result.user?.role).toBe("MEMBER")
  })

  it("returns isAuthenticated=false and user=null when no session", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.isAuthenticated).toBe(false)
    expect(result.isLoading).toBe(false)
    expect(result.user).toBeNull()
  })

  it("returns isLoading=true when session status is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.isLoading).toBe(true)
    expect(result.isAuthenticated).toBe(false)
  })

  it("returns isAdmin=true when user role is ADMIN", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "2", name: "Admin", email: "admin@test.com", role: "ADMIN" },
      },
      status: "authenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.isAdmin).toBe(true)
    expect(result.isTrainer).toBe(false)
    expect(result.isMember).toBe(false)
  })

  it("returns isTrainer=true when user role is TRAINER", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "3", name: "Trainer", email: "trainer@test.com", role: "TRAINER" },
      },
      status: "authenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.isTrainer).toBe(true)
    expect(result.isAdmin).toBe(false)
    expect(result.isMember).toBe(false)
  })

  it("returns isMember=true when user role is MEMBER", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "4", name: "Member", email: "member@test.com", role: "MEMBER" },
      },
      status: "authenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.isMember).toBe(true)
    expect(result.isAdmin).toBe(false)
    expect(result.isTrainer).toBe(false)
  })

  it("returns user=null when session.data is null even if status is authenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "authenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.isAuthenticated).toBe(true)
    expect(result.user).toBeNull()
  })

  it("exposes the update function from useSession", () => {
    const updateFn = vi.fn()
    mockUseSession.mockReturnValue({
      data: { user: { name: "Test" } },
      status: "authenticated",
      update: updateFn,
    } as unknown as ReturnType<typeof useSession>)

    const result = useAuth()

    expect(result.update).toBe(updateFn)
  })
})
