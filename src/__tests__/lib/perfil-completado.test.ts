import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import {
  calculateProfileCompletion,
  getProfileCompletionFields,
  type ProfileCompletionField,
} from "@/lib/profile-completion"
import { isValidBirthDate } from "@/lib/birth-date"

// Issue #107: la barra «Perfil completado» pedía completar datos que el perfil no dejaba editar.
// Issue #153: cada rol cuenta sus propios datos; el admin y el súper admin no tienen barra.
describe("barra «Perfil completado»", () => {
  const vacio = {
    role: "MEMBER",
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

  it("al coach le cuentan nombre, foto, teléfono y la descripción, no los datos de miembro", () => {
    const coach = {
      ...vacio,
      role: "TRAINER",
      objective: "WEIGHT_LOSS",
      experienceLevel: "ADVANCED",
      image: null,
      bio: null,
    }
    expect(calculateProfileCompletion({ ...coach, name: "Diego" })).toBe(25)
    expect(
      calculateProfileCompletion({
        ...coach,
        name: "Diego",
        image: "/uploads/diego.jpg",
        phone: "+51 999 123 456",
        bio: "Fuerza y movilidad",
      })
    ).toBe(100)
  })

  it.each(["ADMIN", "SUPER_ADMIN"])("%s no tiene barra", (role) => {
    expect(getProfileCompletionFields(role)).toBeNull()
    expect(calculateProfileCompletion({ ...vacio, role, name: "Admin" })).toBeNull()
  })

  it("el formulario del perfil tiene un control para cada campo que cuenta", () => {
    const formulario = readFileSync(
      path.join(process.cwd(), "src/components/profile/profile-form.tsx"),
      "utf8"
    )
    const controles: Record<ProfileCompletionField, string> = {
      image: "ref={avatarInputRef}",
      bio: 'id="profileBio"',
      name: 'id="profileName"',
      phone: 'id="profilePhone"',
      sex: 'id="profileSex"',
      birthDate: 'id="profileBirthDate"',
      objective: 'id="profileObjective"',
      experienceLevel: 'id="profileExperience"',
      emergencyContact: 'id="profileEmergencyContact"',
      emergencyPhone: 'id="profileEmergencyPhone"',
    }
    for (const role of ["MEMBER", "TRAINER"]) {
      for (const campo of getProfileCompletionFields(role) ?? []) {
        expect(formulario, campo).toContain(controles[campo])
      }
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
