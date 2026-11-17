import { existsSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"

// Issue #138: en el celular estas pantallas se quedaban en blanco mientras cargaban, porque no
// tenían su `loading.tsx`. (`/requests` no lo necesita: solo redirige al inicio.)
const RUTAS = [
  "login",
  "register",
  "invite/[token]",
  "sessions",
  "coach/payments",
  "coach/schedule",
  "coach/classes/[id]",
  "coach/clients/[id]/personalize",
]

describe("pantallas de carga", () => {
  it.each(RUTAS)("/%s tiene su loading.tsx", (ruta) => {
    expect(existsSync(path.join(process.cwd(), "src/app", ruta, "loading.tsx"))).toBe(true)
  })
})
