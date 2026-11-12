import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Issue #97: en móvil las tarjetas se cortaban por la derecha y el número del globo rojo del
// menú no se leía.
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("tarjetas en móvil", () => {
  // Sin grid-cols-1 la columna implícita crece con el contenido más ancho (una tabla, un texto
  // largo) y la tarjeta se sale de la pantalla.
  it.each([
    "src/app/coach/clients/[id]/page.tsx",
    "src/components/admin/admin-dashboard.tsx",
    "src/components/coach/coach-dashboard.tsx",
    "src/components/dashboard/member-dashboard.tsx",
    "src/components/dashboard/super-admin-dashboard.tsx",
  ])("%s fija una columna en móvil", (ruta) => {
    const fuente = leer(ruta)
    expect(fuente).not.toMatch(/"grid gap-6 (md|lg):grid-cols-\d"/)
    expect(fuente).toMatch(/"grid grid-cols-1 gap-6 (md|lg):grid-cols-\d"/)
  })
})

describe("texto sobre rojo", () => {
  it("el tema define destructive-foreground en claro, en oscuro y como utilidad", () => {
    const css = leer("src/app/globals.css")
    expect(css).toContain("--color-destructive-foreground: var(--destructive-foreground);")
    expect(css.match(/^\s*--destructive-foreground:/gm)).toHaveLength(2)
  })
})
