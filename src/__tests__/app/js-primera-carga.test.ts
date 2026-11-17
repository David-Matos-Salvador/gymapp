import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { validateLogin } from "@/lib/login-form"

// Issue #12: la portada y el login cargaban cerca de 1 MB de JavaScript. Lo pesado
// (animaciones, validación con zod, gráficos) no debe entrar en la primera carga.
const SRC = path.join(process.cwd(), "src")
const PESADAS = ["framer-motion", "zod", "@hookform/resolvers", "recharts"]

function resolver(desde: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? path.join(SRC, spec.slice(2))
    : spec.startsWith(".")
      ? path.resolve(path.dirname(desde), spec)
      : null
  if (!base) return null
  const candidatos = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
  return candidatos.find((c) => existsSync(c) && /\.tsx?$/.test(c)) ?? null
}

// Paquetes de npm a los que llega una página siguiendo sus imports (los `import type` no
// cuentan: no generan JavaScript).
function paquetesDe(entrada: string): Set<string> {
  const paquetes = new Set<string>()
  const vistos = new Set<string>()
  const pendientes = [path.join(process.cwd(), entrada)]
  while (pendientes.length > 0) {
    const archivo = pendientes.pop()!
    if (vistos.has(archivo)) continue
    vistos.add(archivo)
    const fuente = readFileSync(archivo, "utf8")
    const imports = fuente.matchAll(
      /^(?:import|export)\s+(?!type\b)[^"']*?from\s+["']([^"']+)["']/gm
    )
    for (const [, spec] of imports) {
      const local = resolver(archivo, spec)
      if (local) pendientes.push(local)
      else if (!spec.startsWith(".") && !spec.startsWith("@/")) paquetes.add(spec)
    }
  }
  return paquetes
}

describe("JavaScript de la primera carga", () => {
  it.each(["src/app/layout.tsx", "src/app/page.tsx", "src/app/login/page.tsx"])(
    "%s no importa librerías pesadas",
    (entrada) => {
      const paquetes = [...paquetesDe(entrada)]
      // Si esto queda vacío, el recorrido de imports se rompió y la prueba no estaría mirando nada.
      expect(paquetes).toContain("react")
      const pesadas = paquetes.filter((p) => PESADAS.some((x) => p === x || p.startsWith(`${x}/`)))
      expect(pesadas).toEqual([])
    }
  )
})

describe("validación del login", () => {
  it("acepta un correo y una contraseña válidos", () => {
    expect(validateLogin({ email: "ana@example.com", password: "secreta" })).toEqual({})
  })

  it.each(["", "ana", "ana@", "ana@example", "ana @example.com", "@example.com"])(
    "rechaza el correo «%s»",
    (email) => {
      expect(validateLogin({ email, password: "secreta" })).toEqual({ email: "Correo inválido" })
    }
  )

  it("pide al menos 6 caracteres de contraseña", () => {
    expect(validateLogin({ email: "ana@example.com", password: "12345" })).toEqual({
      password: "Mínimo 6 caracteres",
    })
  })

  it("marca los dos campos cuando el formulario llega vacío", () => {
    expect(validateLogin({})).toEqual({
      email: "Correo inválido",
      password: "Mínimo 6 caracteres",
    })
  })
})
