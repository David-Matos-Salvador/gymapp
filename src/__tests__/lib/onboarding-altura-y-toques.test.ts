import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { cleanDecimalInput, heightInputToCm } from "@/constants/measurements"

// Issue #216: la altura en metros («1.68») solo daba error y los botones del encabezado del
// onboarding (y los «Editar» del resumen) medían menos de 44 px.
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("heightInputToCm", () => {
  it("toma una altura con decimales entre 1 y 2,5 como metros", () => {
    expect(heightInputToCm(cleanDecimalInput("1.68")!)).toEqual({ cm: 168, fromMeters: true })
    expect(heightInputToCm(cleanDecimalInput("1,68")!)).toEqual({ cm: 168, fromMeters: true })
    expect(heightInputToCm("1.7")).toEqual({ cm: 170, fromMeters: true })
    expect(heightInputToCm("2.05")).toEqual({ cm: 205, fromMeters: true })
  })

  it("deja los centímetros como están", () => {
    expect(heightInputToCm("168")).toEqual({ cm: 168, fromMeters: false })
    expect(heightInputToCm("170.5")).toEqual({ cm: 170.5, fromMeters: false })
  })

  it("no convierte lo que no es una altura en metros", () => {
    // «1» y «2» sin decimales son el comienzo de «168» o «205» mientras se escribe.
    expect(heightInputToCm("1")).toEqual({ cm: 1, fromMeters: false })
    expect(heightInputToCm("3.5")).toEqual({ cm: 3.5, fromMeters: false })
    expect(heightInputToCm("")).toBeNull()
    expect(heightInputToCm(".")).toBeNull()
  })
})

describe("onboarding: áreas táctiles", () => {
  const fuente = leer("src/app/onboarding/page.tsx")

  it("los botones del encabezado miden 44 px", () => {
    expect(fuente).not.toContain("h-10 w-10")
    expect(fuente.match(/flex h-11 w-11 items-center/g)).toHaveLength(3)
  })

  it("los «Editar» del resumen miden al menos 44 px", () => {
    expect(fuente).toMatch(
      /aria-label=\{`Editar \$\{label\}`\}\s+className="[^"]*min-h-11 min-w-11/
    )
  })

  it("la altura en metros se avisa y se pasa a centímetros al salir del campo", () => {
    expect(fuente).toContain("Lo tomamos como ${height.cm} cm")
    expect(fuente).toContain("onBlur={handleHeightBlur}")
  })
})
