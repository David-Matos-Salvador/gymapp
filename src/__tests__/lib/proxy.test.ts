import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockAuth = vi.fn()
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

import { proxy } from "@/proxy"

function visit(path: string) {
  return proxy(new NextRequest(`http://localhost:3000${path}`))
}

beforeEach(() => {
  mockAuth.mockReset().mockResolvedValue(null)
})

describe("proxy: qué se ve sin sesión", () => {
  it.each(["/", "/login", "/register?gym=fitness-total", "/invite/abc", "/gym/fitness-total"])(
    "%s es pública",
    async (path) => {
      const res = await visit(path)
      expect(res.headers.get("location")).toBeNull()
      expect(res.status).toBe(200)
    }
  )

  it.each(["/dashboard", "/onboarding", "/membresia", "/gym", "/equipamiento"])(
    "%s manda al login",
    async (path) => {
      const res = await visit(path)
      const location = new URL(res.headers.get("location") ?? "", "http://localhost:3000")
      expect(location.pathname).toBe("/login")
      expect(location.searchParams.get("callbackUrl")).toBe(path)
    }
  )

  it("los comprobantes viejos de /uploads/receipts no se sirven ni con sesión", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN", onboardingCompleted: true } })
    const res = await visit("/uploads/receipts/1782148298259-2jcoxi.jpg")
    expect(res.status).toBe(404)
  })

  it("un miembro con sesión y sin onboarding entra a /onboarding", async () => {
    mockAuth.mockResolvedValue({ user: { role: "MEMBER", onboardingCompleted: false } })
    const res = await visit("/onboarding")
    expect(res.headers.get("location")).toBeNull()
  })
})
