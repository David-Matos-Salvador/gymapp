import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { getClassesSubtitle } from "@/lib/classes-subtitle"

// En «Clases» el coach y el admin veían el subtítulo del miembro («Reserva tu lugar…»),
// aunque el admin no puede reservar y el coach además gestiona sus clases.
describe("subtítulo de «Clases» según el perfil", () => {
  it("al miembro lo invita a reservar", () => {
    expect(getClassesSubtitle("MEMBER")).toBe("Reserva tu lugar en clases grupales")
  })

  it("al coach le habla de gestionar sus clases", () => {
    expect(getClassesSubtitle("TRAINER")).toBe(
      "Gestiona tus clases o reserva en las de otros coaches"
    )
  })

  it.each(["ADMIN", "SUPER_ADMIN"])("a %s no le dice que reserve", (role) => {
    expect(getClassesSubtitle(role)).toBe("Clases grupales del gimnasio")
  })

  it("la pantalla usa el subtítulo del perfil", () => {
    const pagina = readFileSync(path.join(process.cwd(), "src/app/classes/page.tsx"), "utf8")
    expect(pagina).toContain("getClassesSubtitle(user.role)")
    expect(pagina).not.toContain(">Reserva tu lugar en clases grupales<")
  })
})
