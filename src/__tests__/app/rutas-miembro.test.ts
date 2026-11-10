import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// La rutina del miembro vive en `/my-routine` (issue #24). Las rutas en español
// (`/rutinas`, `/entrenamiento`) se eliminaron sin redirecciones; coach y admin siguen en
// `/routines`.
const APP = path.join(process.cwd(), "src", "app")
const RUTA_VIEJA = /\/rutinas\b|\/entrenar\/|\/historial\b|\/entrenamiento\//

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre)
    if (nombre === "__tests__") return []
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.tsx?$/.test(nombre) ? [ruta] : []
  })
}

describe("rutas de la rutina del miembro", () => {
  it("existen en inglés, bajo /my-routine", () => {
    for (const pagina of [
      "my-routine/page.tsx",
      "my-routine/[planId]/page.tsx",
      "my-routine/[planId]/workout/[splitId]/page.tsx",
      "my-routine/[planId]/history/page.tsx",
    ]) {
      expect(existsSync(path.join(APP, pagina)), pagina).toBe(true)
    }
  })

  it("ya no existen en español", () => {
    for (const carpeta of ["rutinas", "rutina", "entrenamiento"]) {
      expect(existsSync(path.join(APP, carpeta)), carpeta).toBe(false)
    }
  })

  it("ningún enlace ni redirección apunta a las rutas viejas", () => {
    const fuentes = [
      ...archivos(path.join(process.cwd(), "src")),
      path.join(process.cwd(), "next.config.ts"),
    ]
    const hallazgos = fuentes
      .filter((ruta) => RUTA_VIEJA.test(readFileSync(ruta, "utf8")))
      .map((ruta) => path.relative(process.cwd(), ruta))
    expect(hallazgos).toEqual([])
  })
})
