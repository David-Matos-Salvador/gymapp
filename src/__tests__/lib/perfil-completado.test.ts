import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { PROFILE_COMPLETION_FIELDS, calculateProfileCompletion } from "@/lib/profile-completion"
import { isValidBirthDate } from "@/lib/birth-date"

// Issue #107: la barra «Perfil completado» pedía completar datos que el perfil no dejaba editar.
describe("barra «Perfil completado»", () => {
  const vacio = {
    name: null,
    phone: null,
    sex: null,
    birthDate: null,
    objective: null,
    experienceLevel: null,
    emergencyContact: null,
    emergencyPhone: null,
  }

  it("cuenta los campos llenos sobre el total", () => {
    expect(calculateProfileCompletion(vacio)).toBe(0)
    expect(calculateProfileCompletion({ ...vacio, name: "Ana", phone: "+51 999 123 456" })).toBe(25)
  })

  it("el formulario del perfil tiene un control para cada campo que cuenta", () => {
    const formulario = readFileSync(
      path.join(process.cwd(), "src/components/profile/profile-form.tsx"),
      "utf8"
    )
    const controles: Record<(typeof PROFILE_COMPLETION_FIELDS)[number], string> = {
      name: 'id="profileName"',
      phone: 'id="profilePhone"',
      sex: 'id="profileSex"',
      birthDate: 'id="profileBirthDate"',
      objective: 'id="profileObjective"',
      experienceLevel: 'id="profileExperience"',
      emergencyContact: 'id="profileEmergencyContact"',
      emergencyPhone: 'id="profileEmergencyPhone"',
    }
    for (const campo of PROFILE_COMPLETION_FIELDS) {
      expect(formulario, campo).toContain(controles[campo])
    }
  })
})

describe("fecha de nacimiento", () => {
  const hoy = new Date("2026-11-14T15:00:00.000Z")

  it.each(["1990-06-15", "2026-11-14", "1906-11-14"])("acepta %s", (fecha) => {
    expect(isValidBirthDate(fecha, hoy)).toBe(true)
  })

  it.each(["2026-11-15", "1906-11-13", "1990-02-31", "15/06/1990", "1990-6-15", ""])(
    "rechaza %j",
    (fecha) => {
      expect(isValidBirthDate(fecha, hoy)).toBe(false)
    }
  )
})
