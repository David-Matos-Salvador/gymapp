import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect, vi } from "vitest"

// Issue #155: cada pestaña dice en qué página estás («Mi rutina · GymApp»), no solo «GymApp».
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-sans" }),
  Geist_Mono: () => ({ variable: "--font-mono" }),
}))

const APP = path.join(process.cwd(), "src/app")
const leer = (archivo: string) => readFileSync(archivo, "utf8")

// Páginas que solo redirigen a otra: nunca se llegan a ver, así que no necesitan título.
// La portada (`/`) usa el título por defecto «GymApp»: la plantilla del layout raíz no se
// aplica a la página de su mismo segmento.
const SIN_TITULO = new Set(["", "admin", "coach", "super-admin", "requests", "equipamiento"])

function paginas(dir = APP, ruta = ""): string[] {
  const encontradas: string[] = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (!entrada.isDirectory() || entrada.name === "api") continue
    encontradas.push(
      ...paginas(path.join(dir, entrada.name), ruta ? `${ruta}/${entrada.name}` : entrada.name)
    )
  }
  if (existsSync(path.join(dir, "page.tsx"))) encontradas.push(ruta)
  return encontradas
}

function definicionDeTitulo(ruta: string): string | null {
  for (const archivo of ["page.tsx", "layout.tsx"]) {
    const completo = path.join(APP, ruta, archivo)
    if (!existsSync(completo)) continue
    const src = leer(completo)
    if (/export const metadata|export async function generateMetadata/.test(src)) return src
  }
  return null
}

describe("títulos de pestaña", () => {
  it("el layout raíz arma «Página · GymApp» y deja «GymApp» por defecto", async () => {
    const { metadata } = await import("@/app/layout")
    expect(metadata.title).toEqual({ template: "%s · GymApp", default: "GymApp" })
  })

  it("las páginas de cliente toman su título de un layout al lado", async () => {
    const { metadata: login } = await import("@/app/login/layout")
    const { metadata: registro } = await import("@/app/register/layout")
    expect(login.title).toBe("Iniciar sesión")
    expect(registro.title).toBe("Crear cuenta")
  })

  it("Mi rutina tiene su propio título", () => {
    expect(leer(path.join(APP, "my-routine/page.tsx"))).toContain('title: "Mi rutina"')
  })

  it("toda página que se ve define su título, sin repetir la marca", () => {
    const sinTitulo: string[] = []
    for (const ruta of paginas()) {
      if (SIN_TITULO.has(ruta)) continue
      const src = definicionDeTitulo(ruta)
      if (!src) sinTitulo.push(ruta)
      else expect(src, ruta).not.toMatch(/title: ".*GymApp/)
    }
    expect(sinTitulo).toEqual([])
  })
})
