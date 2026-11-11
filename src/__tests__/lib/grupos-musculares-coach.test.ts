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

  // Issue #89: el buscador mostraba DUMBBELL y, al tocar un grupo, escribía FULL_BODY.
  it("la nueva rutina no muestra el equipo ni el grupo con su valor interno", () => {
    const fuente = leer("src/app/routines/new/page.tsx")
    expect(fuente).toContain("EQUIPMENT_LABELS[ex.equipment]")
    expect(fuente).not.toMatch(/·\s*\{ex\.equipment\}/)
    expect(fuente).toContain("setSearch(MUSCLE_LABELS[group] ?? group)")
    expect(fuente).not.toContain("setSearch(group)")
  })

  it("la nueva rutina ofrece todos los grupos musculares, no solo los primeros (issue #89)", () => {
    const fuente = leer("src/app/routines/new/page.tsx")
    expect(fuente).toContain("muscleGroups.map((group)")
    expect(fuente).not.toMatch(/muscleGroups\.slice\(/)
  })

  it("el detalle del cliente usa formatMuscleGroups (issue #74)", () => {
    const fuente = leer("src/app/coach/clients/[id]/page.tsx")
    expect(fuente).toContain("formatMuscleGroups(s.muscleGroups)")
    expect(fuente).not.toContain("muscleGroups.join(")
  })
})
