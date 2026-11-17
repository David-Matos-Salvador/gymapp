import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// #146: en el texto de JSX las secuencias \u no se interpretan: `más` salía tal cual en
// pantalla. Dentro de un string de JS ("Máximo") sí funcionan, así que solo se revisa el
// texto que queda entre etiquetas o llaves de JSX.
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (statSync(ruta).isDirectory()) return nombre === "__tests__" ? [] : archivos(ruta)
    return nombre.endsWith(".tsx") ? [ruta] : []
  })
}

describe("texto de JSX", () => {
  it("no tiene secuencias \\u escritas tal cual", () => {
    const literales = archivos(path.join(process.cwd(), "src")).flatMap((archivo) =>
      readFileSync(archivo, "utf8")
        .split("\n")
        .map((linea, i) => ({ linea, i }))
        .filter(({ linea }) => /\\u[0-9a-fA-F]{4}/.test(linea))
        // Se quitan los strings ("…", '…', `…`): lo que queda con \u es texto de JSX.
        .filter(({ linea }) =>
          /\\u[0-9a-fA-F]{4}/.test(
            linea.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "")
          )
        )
        .map(({ i }) => `${path.relative(process.cwd(), archivo)}:${i + 1}`)
    )
    expect(literales).toEqual([])
  })
})
