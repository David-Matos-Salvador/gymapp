import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { cleanDecimalInput, measurementFormError } from "@/constants/measurements"

// Issue #95: "72,5" se guardaba como 725 y una medida fuera de rango solo decía "Error al guardar".
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("cleanDecimalInput", () => {
  it("acepta la coma decimal de los teclados en español", () => {
    expect(cleanDecimalInput("72,5")).toBe("72.5")
    expect(cleanDecimalInput("80,5")).toBe("80.5")
  })

  it("deja igual lo escrito con punto y quita lo que no es número", () => {
    expect(cleanDecimalInput("72.5")).toBe("72.5")
    expect(cleanDecimalInput("72 kg")).toBe("72")
    expect(cleanDecimalInput("")).toBe("")
  })

  it("no acepta dos separadores", () => {
    expect(cleanDecimalInput("7,2,5")).toBeNull()
    expect(cleanDecimalInput("7.2,5")).toBeNull()
  })
})

describe("measurementFormError", () => {
  it("no avisa si todo está en rango o vacío", () => {
    expect(measurementFormError({ weight: "72.5", height: "", waist: " " })).toBeNull()
    expect(measurementFormError({ notes: "solo notas" })).toBeNull()
  })

  it("dice qué campo corregir y su rango", () => {
    expect(measurementFormError({ weight: "70", bodyFat: "150" })).toBe(
      "% de grasa: ingresa un valor entre 1 y 70 %"
    )
    expect(measurementFormError({ weight: "725" })).toBe("Peso: ingresa un valor entre 20 y 300 kg")
    expect(measurementFormError({ waist: "9999" })).toBe(
      "Cintura: ingresa un valor entre 10 y 250 cm"
    )
  })
})

describe("quién usa estas ayudas", () => {
  it("el onboarding limpia peso, altura y medidas con cleanDecimalInput", () => {
    const fuente = leer("src/app/onboarding/page.tsx")
    expect(fuente.match(/cleanDecimalInput\(value\)/g)).toHaveLength(3)
    expect(fuente).not.toContain('value.replace(/[^0-9.]/g, "")')
  })

  it("las pantallas de nueva medición avisan el campo antes de enviar", () => {
    expect(leer("src/app/progress/page.tsx")).toContain("measurementFormError(form)")
    expect(leer("src/app/coach/clients/[id]/page.tsx")).toContain(
      "measurementFormError(measureForm)"
    )
  })
})
