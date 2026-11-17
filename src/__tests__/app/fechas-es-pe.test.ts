import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// #139: las fechas se mostraban con formatos de distintos países ("es", "es-MX"). La app es de
// Perú: toda fecha visible usa "es-PE".
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (statSync(ruta).isDirectory()) return nombre === "__tests__" ? [] : archivos(ruta)
    return /\.tsx?$/.test(nombre) ? [ruta] : []
  })
}

describe("fechas en es-PE", () => {
  it("ningún toLocale*String usa otro idioma o país", () => {
    const fuera = archivos(path.join(process.cwd(), "src")).flatMap((archivo) =>
      [...readFileSync(archivo, "utf8").matchAll(/toLocale(?:Date|Time)?String\(\s*"([^"]+)"/g)]
        .filter((m) => m[1] !== "es-PE")
        .map((m) => `${path.relative(process.cwd(), archivo)}: ${m[1]}`)
    )
    expect(fuera).toEqual([])
  })
})
