import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { homeAfterLogin } from "@/lib/login-form"

describe("a dónde lleva el login a cada perfil", () => {
  it("el miembro va a su rutina", () => {
    expect(homeAfterLogin("MEMBER")).toBe("/my-routine")
    expect(homeAfterLogin(undefined)).toBe("/my-routine")
  })

  it("coach, admin y súper admin van directo a su inicio, sin pasar por /my-routine", () => {
    expect(homeAfterLogin("TRAINER")).toBe("/dashboard")
    expect(homeAfterLogin("ADMIN")).toBe("/dashboard")
    expect(homeAfterLogin("SUPER_ADMIN")).toBe("/dashboard")
  })

  it("el login usa el destino por perfil y respeta callbackUrl", () => {
    const page = readFileSync(path.join(process.cwd(), "src/app/login/page.tsx"), "utf8")
    expect(page).toContain(
      'router.push(searchParams.get("callbackUrl") ?? homeAfterLogin(session?.user?.role))'
    )
  })
})
