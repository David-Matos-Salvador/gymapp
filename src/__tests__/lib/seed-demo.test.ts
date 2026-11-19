import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { isValidPhone } from "@/lib/phone"

const seed = readFileSync(path.join(process.cwd(), "prisma/seed.ts"), "utf8")

describe("datos demo del seed (#189)", () => {
  it("los teléfonos demo son peruanos y válidos para la app", () => {
    const phones = [...seed.matchAll(/(?:phone|emergencyPhone): "([^"]+)"/gi)].map((m) => m[1])
    expect(phones.length).toBeGreaterThan(10)
    for (const phone of phones) {
      expect(phone).toMatch(/^\+51 9\d{2} \d{3} \d{3}$/)
      expect(isValidPhone(phone)).toBe(true)
    }
  })

  it("la sesión de piernas de Carlos tiene sus series", () => {
    expect(seed).toMatch(
      /const legsLog = carlosLogs\.find\(\(l\) => l\?\.splitId === pplSplits\[2\]/
    )
    expect(seed).toMatch(/workoutLogId: legsLog\.id/)
  })
})
