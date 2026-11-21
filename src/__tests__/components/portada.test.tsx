// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { PricingSection } from "@/components/landing/pricing-section"
import { CTASection } from "@/components/landing/cta-section"
import { contactWhatsappUrl, normalizePeruWhatsapp } from "@/lib/contact-whatsapp"
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

describe("botón de WhatsApp para gimnasios", () => {
  it("normaliza el número de Perú a solo dígitos con 51 adelante", () => {
    expect(normalizePeruWhatsapp("+51 987 654 321")).toBe("51987654321")
    expect(normalizePeruWhatsapp("987654321")).toBe("51987654321")
    expect(normalizePeruWhatsapp(" 987-654-321 ")).toBe("51987654321")
    expect(normalizePeruWhatsapp("0051987654321")).toBe("51987654321")
    expect(normalizePeruWhatsapp("51987654321")).toBe("51987654321")
    // Fijo de Lima (código 1 + 7 dígitos).
    expect(normalizePeruWhatsapp("1 234 5678")).toBe("5112345678")
  })

  it("sin número o con uno que no es de Perú no hay enlace", () => {
    expect(contactWhatsappUrl(undefined)).toBeNull()
    expect(contactWhatsappUrl("  ")).toBeNull()
    expect(contactWhatsappUrl("12345")).toBeNull()
    expect(contactWhatsappUrl("+1 415 555 0100")).toBeNull()
  })

  it("el enlace es de wa.me con un mensaje inicial", () => {
    const url = contactWhatsappUrl("+51 987 654 321")!
    expect(url.startsWith("https://wa.me/51987654321?text=")).toBe(true)
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Hola, quiero GymApp para mi gimnasio.")
  })

  it("con número, aparece en planes y en el llamado final y abre en otra pestaña", () => {
    const url = "https://wa.me/51987654321"
    render(
      <>
        <PricingSection plans={plans} whatsappUrl={url} />
        <CTASection whatsappUrl={url} />
      </>
    )
    const links = screen.getAllByRole("link", { name: "Escríbenos por WhatsApp" })
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link.getAttribute("href")).toBe(url)
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toContain("noopener")
    }
  })

  it("sin número no se muestra el botón", () => {
    render(
      <>
        <PricingSection plans={plans} />
        <CTASection />
      </>
    )
    expect(screen.queryByRole("link", { name: "Escríbenos por WhatsApp" })).toBeNull()
  })
})
