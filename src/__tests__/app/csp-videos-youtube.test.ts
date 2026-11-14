import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import nextConfig from "../../../next.config"

// Los videos de los ejercicios se muestran en un iframe de YouTube. La política de seguridad
// (hoy en modo solo reporte) no lo permitía: el día que se aplique, los videos dejarían de verse.
describe("política de seguridad de contenido y videos de ejercicios", () => {
  async function politica() {
    const reglas = await nextConfig.headers!()
    const cabecera = reglas
      .flatMap((regla) => regla.headers)
      .find((h) => h.key.startsWith("Content-Security-Policy"))
    return cabecera!
  }

  it("frame-src permite el dominio desde el que se incrustan los videos", async () => {
    const { value } = await politica()
    const frameSrc = value.split("; ").find((d) => d.startsWith("frame-src "))
    expect(frameSrc).toBeDefined()
    expect(frameSrc!.split(" ")).toContain("https://www.youtube.com")
    expect(frameSrc!.split(" ")).toContain("https://accounts.google.com")
  })

  it("las pantallas de ejercicio incrustan el video desde ese mismo dominio", () => {
    for (const archivo of [
      "src/components/workout/exercise-detail-sheet.tsx",
      "src/app/exercise/[id]/page.tsx",
    ]) {
      const fuente = readFileSync(path.join(process.cwd(), archivo), "utf8")
      expect(fuente, archivo).toContain("https://www.youtube.com/embed/")
    }
  })

  it("la política sigue en modo solo reporte", async () => {
    const { key } = await politica()
    expect(key).toBe("Content-Security-Policy-Report-Only")
  })
})
