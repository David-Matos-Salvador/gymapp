import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// La app habla de tú (ver AGENTS.md). Esta prueba evita que vuelva el voseo, el usted
// o las faltas de tilde más comunes en los textos.
const PROHIBIDAS =
  /\b(vos|usted|tenés|podés|querés|necesitás|entrenás|Intentá|Elegí|Usá|Completá|Contactá|Actualizá|Renová|Subí|Ingresá|Gestioná|Esperá|Creá|Activá|Aceptá|mayuscula|numero|contrasena|contrasenas|sesion)\b/i

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (nombre === "__tests__") return []
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(ts|tsx)$/.test(nombre) ? [ruta] : []
  })
}

describe("textos de la app", () => {
  it("usan tú y llevan tildes", () => {
    const hallazgos = archivos(path.join(process.cwd(), "src")).flatMap((ruta) =>
      readFileSync(ruta, "utf8")
        .split("\n")
        .map((linea, i) => ({ ruta, i: i + 1, linea }))
        .filter(({ linea }) => !/^\s*(\/\/|\*|\/\*)/.test(linea) && PROHIBIDAS.test(linea))
        .map(({ ruta, i }) => `${path.relative(process.cwd(), ruta)}:${i}`)
    )
    expect(hallazgos).toEqual([])
  })
})
