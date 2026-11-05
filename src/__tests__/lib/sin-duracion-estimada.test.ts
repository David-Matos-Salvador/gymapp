import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// La duración estimada de las rutinas no se muestra ni se edita (issue #41). La columna
// `estimatedDuration` sigue en la base, pero ninguna pantalla debe usarla.
const PANTALLAS = ["components", "app"]
const PROHIBIDA = /\{[^}]*estimatedDuration|min estimados|Duración estimada|rsDuration/

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (nombre === "__tests__" || nombre === "api") return []
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.tsx$/.test(nombre) ? [ruta] : []
  })
}

describe("duración estimada de las rutinas", () => {
  it("no aparece en las pantallas", () => {
    const hallazgos = PANTALLAS.flatMap((d) =>
      archivos(path.join(process.cwd(), "src", d)).filter((ruta) =>
        readFileSync(ruta, "utf8")
          .split("\n")
          .some((linea) => PROHIBIDA.test(linea) && !/estimatedDuration: /.test(linea))
      )
    ).map((ruta) => path.relative(process.cwd(), ruta))
    expect(hallazgos).toEqual([])
  })
})
