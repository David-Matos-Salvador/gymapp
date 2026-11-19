import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { exercisesPerDay } from "@/lib/utils"

const day = (n: number) => ({ exercises: Array.from({ length: n }) })

describe("exercisesPerDay (#188)", () => {
  it("cuenta los ejercicios de un día, no la suma de todos los días", () => {
    expect(exercisesPerDay([day(4), day(4), day(4)])).toBe("4 ejercicios por día")
  })

  it("con días de distinto largo muestra el rango", () => {
    expect(exercisesPerDay([day(3), day(5), day(4)])).toBe("3–5 ejercicios por día")
  })

  it("usa el singular con un solo ejercicio", () => {
    expect(exercisesPerDay([day(1)])).toBe("1 ejercicio por día")
  })

  it("sin días no habla de días", () => {
    expect(exercisesPerDay([])).toBe("0 ejercicios")
  })

  it("las tarjetas de rutina del onboarding ya no suman los ejercicios de todos los días", () => {
    const page = readFileSync(path.join(process.cwd(), "src/app/onboarding/page.tsx"), "utf8")
    expect(page).not.toContain("totalExercises")
    expect(page).not.toMatch(/s \+ sp\.exercises\.length, 0\)\} ejercicios/)
    expect(page.match(/exercisesPerDay\(/g)).toHaveLength(2)
  })
})
