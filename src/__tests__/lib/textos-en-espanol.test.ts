import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { formatPaymentMethod, formatPaymentType } from "@/constants/payment"
import { getMembershipStatusLabel } from "@/lib/membership-status"

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
  it("existe, está en español y lleva al inicio de la app", () => {
    expect(existsSync(path.join(process.cwd(), "src/app/not-found.tsx"))).toBe(true)
    expect(leer("src/app/not-found.tsx")).toContain("No encontramos esta página")
    expect(leer("src/app/not-found.tsx")).toContain('href="/dashboard"')
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

// Issue #80: el panel del súper admin mostraba los ingresos con "$" y "Crear gym".
describe("panel del súper admin", () => {
  it("muestra los ingresos en soles y los textos en español", () => {
    const panel = leer("src/components/dashboard/super-admin-dashboard.tsx")
    expect(panel).toContain("formatCurrency(stats.totalRevenue)")
    expect(panel).not.toContain("`$$")
    expect(panel).not.toContain("Crear gym")
    expect(panel).not.toContain("Super Admin")
  })
})

// Issue #83: el inicio del miembro mostraba "INACTIVE", y quedaban "Trainers", "Coach Panel"
// y "ya esta registrado" sin tilde.
describe("estado de la membresía en el inicio del miembro", () => {
  it("todos los estados tienen nombre en español", () => {
    for (const estado of [
      "ACTIVE",
      "PENDING_PAYMENT",
      "INACTIVE",
      "EXPIRED",
      "SUSPENDED",
      "CANCELLED",
    ]) {
      expect(getMembershipStatusLabel(estado), estado).not.toBe(estado)
    }
    expect(getMembershipStatusLabel("PENDING_PAYMENT")).toBe("Pago pendiente")
  })

  it("el inicio usa esos nombres y no el valor interno", () => {
    const inicio = leer("src/components/dashboard/member-dashboard.tsx")
    expect(inicio).toContain("getMembershipStatusLabel(membership.status)")
    expect(inicio).not.toContain("Expirada")
  })
})

describe("textos sueltos en inglés o sin tilde", () => {
  it("el admin ve Coaches y no Trainers", () => {
    expect(leer("src/components/admin/gym-management-tabs.tsx")).not.toMatch(/^\s*Trainers$/m)
    expect(leer("src/components/admin/trainer-panel.tsx")).not.toMatch(/trainers? (del|en) /i)
  })

  it("el coach sin clientes lee Panel de Coach", () => {
    expect(leer("src/app/coach/clients/page.tsx")).not.toContain("Coach Panel")
  })

  it("el correo repetido se avisa con tilde", () => {
    for (const ruta of [
      "src/app/api/auth/register/route.ts",
      "src/app/api/trainer/members/route.ts",
      "src/app/api/trainer/invites/[token]/route.ts",
    ]) {
      expect(leer(ruta), ruta).toContain("El email ya está registrado")
    }
  })
})
