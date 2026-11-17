import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { measurementBMI } from "@/lib/health"

// #150: en la ficha del cliente el IMC salía «-» aunque la medición tenía peso y altura.
describe("measurementBMI", () => {
  it("usa el IMC guardado si lo hay", () => {
    expect(measurementBMI({ bmi: 22.1, weight: 62.75, height: 168 })).toBe(22.1)
  })

  it("si no está guardado, lo calcula con el peso y la altura", () => {
    expect(measurementBMI({ bmi: null, weight: 62.75, height: 168 })).toBe(22.2)
  })

  it("sin peso o sin altura no inventa un número", () => {
    expect(measurementBMI({ bmi: null, weight: 70, height: null })).toBeNull()
    expect(measurementBMI({ bmi: null, weight: null, height: 170 })).toBeNull()
  })
})

describe("tabla de mediciones de la ficha del cliente", () => {
  const ficha = readFileSync(
    path.join(process.cwd(), "src/app/coach/clients/[id]/page.tsx"),
    "utf8"
  )

  it("muestra el IMC calculado", () => {
    expect(ficha).toContain("measurementBMI(m)")
    expect(ficha).not.toContain("{m.bmi ?? ")
  })

  it("los encabezados dicen qué medida es", () => {
    expect(ficha).not.toMatch(/>\s*(Pe|Ci|Ca)\.\s*</)
    for (const medida of ["Pecho", "Cintura", "Cadera"]) expect(ficha).toContain(medida)
  })
})
