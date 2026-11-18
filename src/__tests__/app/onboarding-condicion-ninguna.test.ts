import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { physicalConditionLabel, physicalConditionOptions } from "@/app/onboarding/constants"

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8")

describe("condiciones físicas: «Ninguna» en pantalla, «No poseo» en los datos", () => {
  it("el valor guardado sigue siendo «No poseo»", () => {
    expect(physicalConditionOptions).toContain("No poseo")
  })

  it("en pantalla dice «Ninguna» y las demás no cambian", () => {
    expect(physicalConditionLabel("No poseo")).toBe("Ninguna")
    expect(physicalConditionLabel("Lesión")).toBe("Lesión")
  })

  it("la indicación nombra la opción que se ve, no «Continuar»", () => {
    const page = read("src/app/onboarding/page.tsx")
    expect(page).toContain("Si no tienes ninguna, toca «Ninguna».")
    expect(page).not.toContain("toca Continuar")
  })
})

describe("perfil", () => {
  it("el tamaño máximo de la foto lleva espacio: «5 MB»", () => {
    const form = read("src/components/profile/profile-form.tsx")
    expect(form).toContain("(máx. 5 MB)")
    expect(form).not.toContain("5MB")
  })
})
