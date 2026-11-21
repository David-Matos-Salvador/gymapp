import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { inviteState } from "@/lib/trainer-invite"

// En el panel del coach, las invitaciones vencidas (status PENDING en la base, pero con la fecha
// pasada) seguían con «expira 19/11/2026» y «Copiar enlace», y copiar una marcaba «Copiado» en
// todos los botones a la vez.
const now = new Date("2026-11-21T12:00:00Z")

describe("inviteState", () => {
  it("una pendiente con fecha futura sigue pendiente", () => {
    expect(inviteState({ status: "PENDING", expiresAt: "2026-11-25T00:00:00Z" }, now)).toBe(
      "pending"
    )
  })

  it("una pendiente con la fecha pasada está vencida", () => {
    expect(inviteState({ status: "PENDING", expiresAt: "2026-11-19T00:00:00Z" }, now)).toBe(
      "expired"
    )
    expect(inviteState({ status: "EXPIRED", expiresAt: "2026-11-25T00:00:00Z" }, now)).toBe(
      "expired"
    )
  })

  it("una aceptada queda aceptada aunque haya pasado la fecha", () => {
    expect(inviteState({ status: "COMPLETED", expiresAt: "2026-11-19T00:00:00Z" }, now)).toBe(
      "accepted"
    )
  })
})

describe("lista de invitaciones del coach", () => {
  const fuente = readFileSync(
    path.join(process.cwd(), "src/components/coach/coach-dashboard.tsx"),
    "utf8"
  )

  it("las vencidas no ofrecen copiar el enlace", () => {
    expect(fuente).toContain("Vencida")
    expect(fuente).toMatch(/state === "expired" \? \(\s*<Badge/)
    expect(fuente).not.toContain("· expira")
  })

  it("«Copiado» se marca solo en el botón que se tocó", () => {
    expect(fuente).not.toMatch(/\{copied \?/)
    expect(fuente).toContain('copiedKey === inv.id ? "Copiado" : "Copiar enlace"')
  })
})
