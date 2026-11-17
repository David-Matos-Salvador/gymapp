import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Issue #177: el comprobante ampliado era un div fijo hecho a mano, sin «Cerrar» ni Escape.
describe("Comprobantes: comprobante ampliado", () => {
  const src = readFileSync(path.join(process.cwd(), "src/app/coach/payments/page.tsx"), "utf8")

  it("se muestra en el Dialog de la app (botón Cerrar, Escape y foco)", () => {
    expect(src).toMatch(/<Dialog\s+open=\{previewReceipt !== null\}/)
    expect(src).toMatch(/<DialogTitle>Comprobante de pago<\/DialogTitle>/)
  })

  it("ya no usa el fondo hecho a mano que solo se cerraba tocando fuera de la imagen", () => {
    expect(src).not.toMatch(/fixed inset-0 z-50 bg-black\/60/)
  })
})
