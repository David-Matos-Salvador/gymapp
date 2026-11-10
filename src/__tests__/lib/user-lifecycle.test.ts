import { describe, it, expect, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { anonymizedUserData, canSignIn } from "@/lib/user-lifecycle"

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), "utf8")

describe("user-lifecycle", () => {
  it("un usuario desactivado no puede iniciar sesión", () => {
    expect(canSignIn({ deletedAt: null })).toBe(true)
    expect(canSignIn({ deletedAt: new Date() })).toBe(false)
  })

  it("al anonimizar no queda ningún dato personal ni forma de entrar", () => {
    const data = anonymizedUserData("u1")
    expect(data.email).toBe("eliminado-u1@anonimo.invalid")
    expect(data.password).toBeNull()
    for (const campo of [
      "image",
      "phone",
      "birthDate",
      "medicalNotes",
      "emergencyContact",
      "emergencyPhone",
    ] as const) {
      expect(data[campo]).toBeNull()
    }
  })

  it("los correos anonimizados no chocan entre usuarios", () => {
    expect(anonymizedUserData("a").email).not.toBe(anonymizedUserData("b").email)
  })
})

describe("esquema: borrar una persona o un plan no se lleva pagos ni historial", () => {
  const schema = leer("prisma/schema.prisma")
  const modelo = (nombre: string) =>
    schema.match(new RegExp(`model ${nombre} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? ""

  it.each([
    ["Payment", "user "],
    ["Membership", "user "],
    ["Class", "trainer "],
    ["RoutinePlan", "user "],
    ["MembershipPlan", "gym "],
  ])("%s -> %s usa onDelete: Restrict", (nombre, campo) => {
    const linea = modelo(nombre)
      .split("\n")
      .find((l) => l.trim().startsWith(campo))
    expect(linea).toContain("onDelete: Restrict")
  })

  it("el cascade se mantiene en sesiones, cuentas y series", () => {
    expect(modelo("Session")).toContain("onDelete: Cascade")
    expect(modelo("Account")).toContain("onDelete: Cascade")
    expect(modelo("WorkoutSetLog")).toContain("onDelete: Cascade")
  })

  it("User tiene deletedAt", () => {
    expect(modelo("User")).toMatch(/deletedAt\s+DateTime\?/)
  })
})
