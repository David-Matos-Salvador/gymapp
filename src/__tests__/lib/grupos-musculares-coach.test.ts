import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Las pantallas del coach muestran los grupos musculares en español (issue #50),
// no el valor interno (CHEST, FULL_BODY).
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("grupos musculares en las pantallas del coach", () => {
  it("el detalle de rutina usa formatMuscleGroups", () => {
    const fuente = leer("src/app/routines/[id]/page.tsx")
    expect(fuente).toContain("formatMuscleGroups(split.muscleGroups)")
    expect(fuente).not.toContain("muscleGroups.join(")
  })

  it("la nueva rutina traduce filtros y ejercicios", () => {
    const fuente = leer("src/app/routines/new/page.tsx")
    expect(fuente).toContain("MUSCLE_LABELS[group]")
    expect(fuente).toContain("MUSCLE_LABELS[ex.muscleGroup]")
  })
})
