import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Issue #201: en las listas de clientes del coach, «Activo» no decía que era la membresía
// y los clientes sin membresía no tenían ninguna etiqueta.
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("etiqueta de membresía en los clientes del coach", () => {
  it.each(["src/app/coach/clients/page.tsx", "src/components/coach/coach-dashboard.tsx"])(
    "%s dice «Membresía activa» o «Sin membresía activa»",
    (ruta) => {
      const fuente = leer(ruta)
      expect(fuente).not.toMatch(/(\/>|^)\s*Activo\s*$/m)
      expect(fuente).toContain("Membresía activa")
      expect(fuente).toContain("Sin membresía activa")
    }
  )

  it("la ficha del cliente usa el mismo texto", () => {
    const ficha = leer("src/app/coach/clients/[id]/page.tsx")
    expect(ficha).not.toMatch(/\/>\s*Activo\s*$/m)
    expect(ficha).toContain("Membresía activa")
  })
})
