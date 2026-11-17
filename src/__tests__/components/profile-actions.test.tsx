// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

const signOut = vi.hoisted(() => vi.fn())
const play = vi.hoisted(() => vi.fn())

vi.mock("next-auth/react", () => ({ signOut }))
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play }) }))

import { ProfileActions } from "@/components/profile/profile-actions"

describe("ProfileActions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("enlaza a configuración y a pagos", () => {
    render(<ProfileActions />)

    expect(screen.getByRole("link", { name: /Configuración/ }).getAttribute("href")).toBe(
      "/profile/settings"
    )
    expect(screen.getByRole("link", { name: /Pagos/ }).getAttribute("href")).toBe(
      "/profile/payments"
    )
    expect(screen.getByText("Historial de tus pagos")).toBeTruthy()
  })

  it("«Cerrar sesión» sale y lleva al login", () => {
    render(<ProfileActions />)

    fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión/ }))

    expect(play).toHaveBeenCalledWith("click")
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" })
  })
})
