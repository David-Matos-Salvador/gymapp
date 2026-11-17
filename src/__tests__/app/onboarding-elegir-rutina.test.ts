import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { scheduleLabelMap, scheduleOptions } from "@/app/onboarding/constants"

// Issue #168: elegir la rutina solo con doble toque no se descubre ni funciona con teclado, y
// los horarios decían «5am - 8am» en vez del formato de Perú.
describe("onboarding: elegir rutina", () => {
  const src = readFileSync(path.join(process.cwd(), "src/app/onboarding/page.tsx"), "utf8")

  it("la tarjeta abierta muestra un botón para elegir la rutina", () => {
    expect(src).toMatch(/onClick=\{\(\) => assignPlan\(plan\.id\)\}[\s\S]{0,200}Elegir esta rutina/)
    expect(src).toMatch(/onClick=\{finishWithCoachPlan\}[\s\S]{0,200}Usar esta rutina/)
  })

  it("las tarjetas dicen si están abiertas", () => {
    expect(src.match(/aria-expanded=/g)?.length).toBe(2)
  })
})

describe("onboarding: horarios", () => {
  const textos = [...scheduleOptions.map((o) => o.time), ...Object.values(scheduleLabelMap)]

  it("usan «a. m.» y «p. m.», no «am» o «pm» pegado", () => {
    for (const texto of textos) {
      expect(texto).not.toMatch(/\d(am|pm)/i)
      expect(texto).toMatch(/[ap]\. m\./)
    }
  })
})
