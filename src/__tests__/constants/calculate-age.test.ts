import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { calculateAge } from "@/constants/user"

describe("calculateAge", () => {
  it("devuelve la edad con la unidad una sola vez", () => {
    const birth = new Date()
    birth.setFullYear(birth.getFullYear() - 30)
    birth.setDate(birth.getDate() - 1)
    expect(calculateAge(birth.toISOString())).toBe("30 años")
  })

  it("devuelve null sin fecha", () => {
    expect(calculateAge(null)).toBeNull()
  })

  it("la ficha del coach no vuelve a agregar la unidad", () => {
    const page = readFileSync("src/app/coach/clients/[id]/page.tsx", "utf8")
    expect(page).not.toContain("${age} años")
  })
})
