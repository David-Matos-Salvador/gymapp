import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { formatPaymentMethod, formatPaymentType } from "@/constants/payment"

// Issue #74: los valores internos (YAPE, MEMBERSHIP) y los textos por defecto en inglés
// no se muestran al usuario, y los contadores usan singular cuando es 1.
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("método y tipo de pago", () => {
  it("se muestran en español", () => {
    expect(formatPaymentMethod("YAPE")).toBe("Yape")
    expect(formatPaymentMethod("CASH")).toBe("Efectivo")
    expect(formatPaymentMethod("TRANSFER")).toBe("Transferencia")
    expect(formatPaymentType("MEMBERSHIP")).toBe("Membresía")
  })

  it("un valor desconocido se deja tal cual", () => {
    expect(formatPaymentMethod("BITCOIN")).toBe("BITCOIN")
    expect(formatPaymentType("RARO")).toBe("RARO")
  })

  it("los comprobantes y los pagos del admin no muestran el valor interno", () => {
    const comprobantes = leer("src/app/coach/payments/page.tsx")
    expect(comprobantes).not.toMatch(/\{payment\.(method|type)\}/)
    const pagosAdmin = leer("src/components/admin/payment-ledger.tsx")
    expect(pagosAdmin).not.toMatch(/\{payment\.method\}/)
  })
})

describe("página no encontrada", () => {
  it("existe y está en español", () => {
    expect(existsSync(path.join(process.cwd(), "src/app/not-found.tsx"))).toBe(true)
    expect(leer("src/app/not-found.tsx")).toContain("No encontramos esta página")
  })
})

describe("plurales del inicio del miembro", () => {
  it("la racha y los días restantes no llevan el plural fijo", () => {
    const inicio = leer("src/components/dashboard/member-dashboard.tsx")
    expect(inicio).not.toMatch(/\} semanas/)
    expect(inicio).not.toMatch(/\} días/)
    expect(inicio).toContain('pluralize(weeklyStreak.bestStreak, "semana", "semanas")')
    expect(inicio).toContain("formatDays(membership.daysRemaining)")
  })
})
