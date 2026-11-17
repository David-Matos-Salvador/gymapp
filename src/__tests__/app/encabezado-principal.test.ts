import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Issue #167: los lectores de pantalla usan el h1 para saber en qué pantalla están.
const leer = (archivo: string) => readFileSync(path.join(process.cwd(), archivo), "utf8")

describe("encabezado principal (h1) en las pantallas del miembro nuevo", () => {
  it.each([
    ["login", "src/app/login/page.tsx"],
    ["registro", "src/app/register/page.tsx"],
    ["membresía", "src/app/membresia/membresia-content.tsx"],
  ])("%s tiene un h1", (_nombre, archivo) => {
    expect(leer(archivo)).toMatch(/<h1[\s>]|<CardTitle\s+as="h1"/)
  })

  it("cada paso del onboarding usa h1 para su título", () => {
    const src = leer("src/app/onboarding/page.tsx")
    expect(src.match(/<h1[\s>]/g)?.length).toBeGreaterThanOrEqual(11)
    expect(src).not.toMatch(/<h2 className="text-2xl font-bold/)
  })
})

describe("hoja «Detalle» del ejercicio", () => {
  it("tiene descripción para que Radix no avise en la consola", () => {
    expect(leer("src/components/workout/exercise-detail-sheet.tsx")).toMatch(/<SheetDescription/)
  })
})
