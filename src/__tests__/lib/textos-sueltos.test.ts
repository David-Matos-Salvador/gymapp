import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { getBookingStatusLabel } from "@/lib/booking-status"

// Issue #106: textos que no seguían la regla de AGENTS.md (español neutro de Perú y LATAM).
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("estado de una reserva de clase", () => {
  it("se muestra en español", () => {
    expect(getBookingStatusLabel("CONFIRMED")).toBe("Confirmada")
    expect(getBookingStatusLabel("ATTENDED")).toBe("Asistió")
    expect(getBookingStatusLabel("CANCELLED")).toBe("Cancelada")
  })

  it("un valor desconocido se deja tal cual", () => {
    expect(getBookingStatusLabel("RARO")).toBe("RARO")
  })

  it("el detalle de la clase del coach no muestra el valor interno", () => {
    const detalle = leer("src/components/coach/class-manager.tsx")
    expect(detalle).not.toMatch(/>\s*\{booking\.status\}\s*</)
    expect(detalle).toContain("getBookingStatusLabel(booking.status)")
    expect(detalle).not.toContain("Inscriptos")
  })
})

describe("textos sueltos", () => {
  it.each([
    ["src/components/coach/coach-dashboard.tsx", "Copiar link"],
    ["src/components/coach/coach-dashboard.tsx", "Crear link"],
    ["src/components/coach/coach-dashboard.tsx", "El link expira"],
    ["src/components/admin/member-management.tsx", "socios"],
    ["src/components/admin/membership-plan-manager.tsx", "socios"],
    ["src/components/dashboard/member-dashboard.tsx", "Siguiente split"],
    ["src/components/ui/dialog.tsx", ">Close<"],
    ["src/components/ui/sheet.tsx", ">Close<"],
  ])("%s ya no dice «%s»", (archivo, texto) => {
    expect(leer(archivo)).not.toContain(texto)
  })

  it.each([
    "src/components/classes/classes-view.tsx",
    "src/components/coach/coach-dashboard.tsx",
    "src/components/dashboard/member-dashboard.tsx",
  ])("%s separa el número de «min»", (archivo) => {
    expect(leer(archivo)).not.toMatch(/\}min\b/)
  })

  it.each([
    "src/components/profile/profile-form.tsx",
    "src/components/coach/coach-dashboard.tsx",
    "src/app/invite/[token]/page.tsx",
    "src/components/dashboard/super-admin-dashboard.tsx",
  ])("%s pone un teléfono de ejemplo de Perú", (archivo) => {
    const ejemplos = [...leer(archivo).matchAll(/placeholder="(\+\d[^"]*)"/g)].map((m) => m[1])
    expect(ejemplos.length).toBeGreaterThan(0)
    for (const ejemplo of ejemplos) expect(ejemplo).toMatch(/^\+51/)
  })
})
