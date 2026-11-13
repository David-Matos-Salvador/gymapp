import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Al reservar una clase sin membresía activa el aviso no decía a dónde ir.
describe("reservar una clase sin membresía", () => {
  const vista = readFileSync(
    path.join(process.cwd(), "src/components/classes/classes-view.tsx"),
    "utf8"
  )

  it("el aviso del miembro lleva a «Membresía»", () => {
    expect(vista).toContain('data.code === "MEMBERSHIP_REQUIRED"')
    expect(vista).toContain('label: "Ver membresía"')
    expect(vista).toContain('router.push("/membresia")')
  })
})
