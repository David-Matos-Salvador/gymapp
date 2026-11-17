import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import path from "path"
import { formatSessionVolume, formatSet, pluralize } from "@/lib/utils"

describe("pluralize", () => {
  it("usa el singular con 1", () => {
    expect(pluralize(1, "ejercicio", "ejercicios")).toBe("1 ejercicio")
  })

  it("usa el plural con 0 y con más de 1", () => {
    expect(pluralize(0, "ejercicio", "ejercicios")).toBe("0 ejercicios")
    expect(pluralize(5, "serie", "series")).toBe("5 series")
  })
})

// El historial mostraba las series de peso corporal como «10×0kg».
describe("formatSet", () => {
  it("con peso muestra repeticiones y kilos", () => {
    expect(formatSet(8, 82.5)).toBe("8×82.5kg")
  })

  it("sin peso muestra solo las repeticiones", () => {
    expect(formatSet(10, 0)).toBe("10 reps")
    expect(formatSet(1, 0)).toBe("1 rep")
  })

  it.each(["src/app/my-routine/[planId]/history/page.tsx", "src/app/coach/clients/[id]/page.tsx"])(
    "%s muestra las series con formatSet",
    (file) => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8")
      expect(source).toContain("formatSet(")
      expect(source).not.toMatch(/weight\}kg/)
    }
  )
})

// Una sesión de solo peso corporal (burpees, dominadas) salía con «0 kg volumen».
describe("formatSessionVolume", () => {
  it("con peso muestra el volumen en kg", () => {
    expect(
      formatSessionVolume([
        { reps: 10, weight: 20 },
        { reps: 8, weight: 22.5 },
      ])
    ).toBe("380 kg volumen")
  })

  it("solo con peso corporal muestra el total de repeticiones", () => {
    expect(
      formatSessionVolume([
        { reps: 10, weight: 0 },
        { reps: 12, weight: 0 },
      ])
    ).toBe("22 reps en total")
    expect(formatSessionVolume([{ reps: 1, weight: 0 }])).toBe("1 rep en total")
  })

  it("sin series no muestra nada", () => {
    expect(formatSessionVolume([])).toBeNull()
  })

  it("el historial usa formatSessionVolume", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/my-routine/[planId]/history/page.tsx"),
      "utf8"
    )
    expect(source).toContain("formatSessionVolume(")
    expect(source).not.toContain("kg volumen")
  })
})
