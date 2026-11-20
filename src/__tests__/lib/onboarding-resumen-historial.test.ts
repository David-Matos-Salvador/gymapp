import { describe, it, expect } from "vitest"
import { trainingHistoryLabelMap, trainingHistoryOptions } from "@/app/onboarding/constants"

// El resumen del onboarding decía «Historial: 2x a 3x» en vez de lo que la persona eligió.
describe("resumen del onboarding: historial de entrenamiento", () => {
  it.each(trainingHistoryOptions)("$value se resume igual que la opción elegida", (opcion) => {
    expect(trainingHistoryLabelMap[opcion.value]).toBe(opcion.label)
  })

  it("no usa la abreviatura «2x»", () => {
    expect(Object.values(trainingHistoryLabelMap).join(" ")).not.toMatch(/\dx\b/)
  })
})
