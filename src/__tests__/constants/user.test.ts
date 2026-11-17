import { describe, it, expect } from "vitest"
import { formatExerciseCategory, formatMuscleGroups, parseMuscleGroups } from "@/constants/user"

// #139: el formulario de días mostraba y pedía los músculos en inglés ("CHEST, BICEPS").
describe("parseMuscleGroups", () => {
  it("lee los músculos escritos en español, con o sin tildes ni mayúsculas", () => {
    expect(parseMuscleGroups("Pecho, biceps , TRÍCEPS")).toEqual(["CHEST", "BICEPS", "TRICEPS"])
    expect(parseMuscleGroups("cuerpo completo")).toEqual(["FULL_BODY"])
  })

  it("acepta los valores guardados y devuelve lo mismo que muestra el formulario", () => {
    const guardados = ["CHEST", "FULL_BODY", "GLUTES"]
    expect(parseMuscleGroups("CHEST, full_body")).toEqual(["CHEST", "FULL_BODY"])
    expect(parseMuscleGroups(formatMuscleGroups(guardados))).toEqual(guardados)
  })

  it("ignora lo vacío y deja tal cual lo que no reconoce", () => {
    expect(parseMuscleGroups("")).toEqual([])
    expect(parseMuscleGroups("Pecho,, Cuello")).toEqual(["CHEST", "Cuello"])
  })
})

describe("formatMuscleGroups", () => {
  it("translates muscle groups to Spanish", () => {
    expect(formatMuscleGroups(["CHEST", "BACK", "FULL_BODY"])).toBe(
      "Pecho, Espalda, Cuerpo completo"
    )
  })

  it("uses the given separator", () => {
    expect(formatMuscleGroups(["LEGS", "GLUTES"], " · ")).toBe("Piernas · Glúteos")
  })

  it("keeps unknown values as they come", () => {
    expect(formatMuscleGroups(["NECK"])).toBe("NECK")
  })
})

describe("formatExerciseCategory", () => {
  it("translates Strength to Spanish", () => {
    expect(formatExerciseCategory("Strength")).toBe("Fuerza")
  })

  it("keeps other categories as they come", () => {
    expect(formatExerciseCategory("Cardio")).toBe("Cardio")
    expect(formatExerciseCategory("Movilidad")).toBe("Movilidad")
  })
})
