import { describe, it, expect } from "vitest"
import { OBJECTIVE_LABELS } from "@/constants/user"
import { objectiveLabelMap } from "@/app/onboarding/constants"

// Issue #215: la persona elegía «Mejorar forma física» en el onboarding y en su perfil (y en
// «Mis clientes» del coach) veía «Fitness general».
describe("nombres del objetivo", () => {
  it.each(["WEIGHT_LOSS", "MUSCLE_GAIN", "GENERAL_FITNESS"])(
    "%s se llama igual en el onboarding y en el perfil",
    (objective) => {
      expect(OBJECTIVE_LABELS[objective]).toBe(objectiveLabelMap[objective])
    }
  )

  it("no queda «Fitness general» en inglés a medias", () => {
    expect(Object.values(OBJECTIVE_LABELS)).not.toContain("Fitness general")
  })
})
