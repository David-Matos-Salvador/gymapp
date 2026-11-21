import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// El amarillo de marca #ffd700 sobre blanco tiene contraste 1,4:1 (issue #229): se usa solo como
// fondo. El texto y los íconos amarillos van con `text-gold`, que en el tema claro es un dorado
// oscuro con contraste AA.
const PROHIBIDA = /(^|[^\w-])(?:[\w-]+:)*text-(?:primary|accent-yellow)(?:\/\d+)?(?![\w-])/

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (nombre === "__tests__") return []
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.tsx?$/.test(nombre) ? [ruta] : []
  })
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

describe("contraste del amarillo en el tema claro", () => {
  it("ninguna pantalla usa text-primary ni text-accent-yellow como color de texto", () => {
    const hallazgos = archivos(path.join(process.cwd(), "src"))
      .filter((ruta) => PROHIBIDA.test(readFileSync(ruta, "utf8")))
      .map((ruta) => path.relative(process.cwd(), ruta))
    expect(hallazgos).toEqual([])
  })

  it("el dorado del tema claro tiene contraste AA sobre blanco y sobre las tarjetas", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8")
    const claro = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"))
    const gold = claro.match(/--gold: (#[0-9a-f]{6});/i)?.[1]
    expect(gold).toBeDefined()
    expect(contraste(gold!, "#ffffff")).toBeGreaterThanOrEqual(4.5)
    // Tarjetas (oklch 0.97) y fondos grises (oklch 0.94), aproximados en hex.
    expect(contraste(gold!, "#f4f4f4")).toBeGreaterThanOrEqual(4.5)
    expect(contraste(gold!, "#ebebeb")).toBeGreaterThanOrEqual(4.5)
  })
})
