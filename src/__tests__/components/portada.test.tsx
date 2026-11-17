// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { PricingSection } from "@/components/landing/pricing-section"
import { roles, steps, plans } from "@/constants/landing"

afterEach(cleanup)

// #137: la portada cuenta lo que la app hace hoy y no muestra precios que no están definidos.
describe("portada", () => {
  it("los planes muestran «Precio por definir» y ningún precio en dólares", () => {
    const { container } = render(<PricingSection plans={plans} />)
    expect(screen.getAllByText("Precio por definir")).toHaveLength(plans.length)
    expect(container.textContent).not.toMatch(/\$\s?\d/)
    expect(screen.queryByText(/Enterprise/i)).toBeNull()
  })

  it("no anuncia funciones que todavía no existen", () => {
    const textos = JSON.stringify({ roles, steps, plans })
    // Stripe, avisos push y días fijos son `despues-de-produccion`; QR, sucursales y la prueba
    // gratis los prometía la portada anterior sin que la app los tuviera.
    for (const prometido of [/stripe/i, /push/i, /\bQR\b/, /sucursal/i, /prueba gratis/i]) {
      expect(textos).not.toMatch(prometido)
    }
  })

  it("habla de tú", () => {
    const textos = JSON.stringify({ roles, steps, plans })
    expect(textos).not.toMatch(/\b(usted|podés|elegí|vos)\b/i)
  })
})
