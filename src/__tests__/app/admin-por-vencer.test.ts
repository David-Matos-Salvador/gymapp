import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Issue #171: «Membresías por vencer» listaba membresías con el pago sin confirmar, que
// «Membresías activas» no cuenta.
describe("inicio del admin: membresías por vencer", () => {
  const src = readFileSync(path.join(process.cwd(), "src/app/dashboard/page.tsx"), "utf8")

  it("solo incluye membresías con el pago confirmado", () => {
    const consulta = src.match(/endDate: \{ gt: now, lte: nextWeek \},[\s\S]*?\n\s*\},\n/)?.[0]
    expect(consulta).toBeDefined()
    expect(consulta).toMatch(/paymentConfirmed: true/)
  })
})
