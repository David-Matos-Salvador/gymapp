import { describe, it, expect } from "vitest"
import { pluralize } from "@/lib/utils"

describe("pluralize", () => {
  it("usa el singular con 1", () => {
    expect(pluralize(1, "ejercicio", "ejercicios")).toBe("1 ejercicio")
  })

  it("usa el plural con 0 y con más de 1", () => {
    expect(pluralize(0, "ejercicio", "ejercicios")).toBe("0 ejercicios")
    expect(pluralize(5, "serie", "series")).toBe("5 series")
  })
})
