import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { isMeasurementInRange, measurementRangeMessage } from "@/constants/measurements"
import { bodyMeasurementSchema } from "@/lib/validation"

// Issue #78: el onboarding y las APIs aceptaban medidas imposibles (150 % de grasa, 9999 cm).
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("rangos de las medidas corporales", () => {
  it("acepta valores normales", () => {
    expect(isMeasurementInRange("bodyFat", 18)).toBe(true)
    expect(isMeasurementInRange("waist", 80)).toBe(true)
    expect(isMeasurementInRange("muscleMass", 35)).toBe(true)
  })

  it("rechaza valores imposibles", () => {
    expect(isMeasurementInRange("bodyFat", 150)).toBe(false)
    expect(isMeasurementInRange("waist", 9999)).toBe(false)
    expect(isMeasurementInRange("neck", 0)).toBe(false)
    expect(isMeasurementInRange("chest", NaN)).toBe(false)
  })

  it("el aviso dice el rango con su unidad", () => {
    expect(measurementRangeMessage("bodyFat")).toBe("Entre 1 y 70 %")
    expect(measurementRangeMessage("waist")).toBe("Entre 10 y 250 cm")
  })
})

describe("bodyMeasurementSchema", () => {
  it("acepta una medición normal o parcial", () => {
    const normal = bodyMeasurementSchema.safeParse({ weight: 80.5, height: 175, bodyFat: 15 })
    expect(normal.success).toBe(true)
    expect(bodyMeasurementSchema.safeParse({ notes: "solo notas" }).success).toBe(true)
  })

  it("rechaza valores fuera de rango", () => {
    expect(bodyMeasurementSchema.safeParse({ bodyFat: 150 }).success).toBe(false)
    expect(bodyMeasurementSchema.safeParse({ waist: 9999 }).success).toBe(false)
    expect(bodyMeasurementSchema.safeParse({ weight: 5 }).success).toBe(false)
  })
})

describe("quién usa los rangos", () => {
  it("el paso de medidas del onboarding avisa y no deja continuar", () => {
    const fuente = leer("src/app/onboarding/page.tsx")
    expect(fuente).toContain("measurementRangeMessage(f.key)")
    expect(fuente).toContain("const canProceedStep7 = Object.keys(measurementErrors).length === 0")
  })

  it("las APIs no guardan valores fuera de rango", () => {
    expect(leer("src/app/api/onboarding/route.ts")).toContain("isMeasurementInRange(key, v)")
    expect(leer("src/app/api/body-measurements/route.ts")).toContain("bodyMeasurementSchema")
    expect(leer("src/app/api/body-measurements/[id]/route.ts")).toContain("bodyMeasurementSchema")
  })
})
