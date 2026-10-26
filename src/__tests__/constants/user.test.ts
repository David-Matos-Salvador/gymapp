import { describe, it, expect } from "vitest"
import { formatMuscleGroups } from "@/constants/user"

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
