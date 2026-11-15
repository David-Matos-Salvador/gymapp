import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import path from "path"

// #129: la página pedía el ejercicio con fetch a su propia API desde el servidor, sin la
// sesión, y la API respondía 401: siempre salía «Algo salió mal».
const page = readFileSync(path.join(process.cwd(), "src/app/exercise/[id]/page.tsx"), "utf8")

describe("Página /exercise/[id]", () => {
  it("lee el ejercicio de la base, sin fetch a la API ni dirección armada a mano", () => {
    expect(page).toContain("prisma.exercise.findUnique")
    expect(page).not.toMatch(/\bfetch\(/)
    expect(page).not.toContain("NEXT_PUBLIC_APP_URL")
    expect(page).not.toContain("localhost")
  })

  it("muestra el grupo muscular y el equipo en español", () => {
    expect(page).toContain("MUSCLE_LABELS[exercise.muscleGroup]")
    expect(page).toContain("EQUIPMENT_LABELS[exercise.equipment]")
    expect(page).not.toContain("humanizeEnum")
  })
})
