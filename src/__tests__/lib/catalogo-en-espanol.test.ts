import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { generatedPlanName } from "@/lib/generated-routine"

// Catálogo de ejercicios y rutinas generadas en español (#165, #188). «Burpees» se queda: así
// se dice en los gimnasios de Perú.
const EN_INGLES = [
  "Full Body",
  "Hip thrust",
  "Kettlebell swing",
  "Face Pull",
  '"Crunch"',
  "Crunches",
  "Russian Twist",
  "Clean and Press",
  "Thrusters",
  "Battle ropes",
  "Mountain climbers",
  "Push (Empuje)",
  "Upper/Lower",
]

/** El archivo sin las URL de imágenes (las fotos del catálogo vienen de un repositorio en inglés). */
function leer(ruta: string): string {
  return readFileSync(path.join(process.cwd(), ruta), "utf8")
    .split("\n")
    .filter((linea) => !linea.includes("https://"))
    .join("\n")
}

describe("catálogo en español", () => {
  it.each(["src/app/api/fitness-coach/route.ts", "prisma/seed.ts"])(
    "%s no usa los nombres en inglés",
    (ruta) => {
      const texto = leer(ruta)
      expect(EN_INGLES.filter((nombre) => texto.includes(nombre))).toEqual([])
    }
  )
})

describe("generatedPlanName", () => {
  it("dice «3 días» en vez de «3d» y usa el mismo nombre de objetivo que el resto de la app", () => {
    expect(generatedPlanName("Cuerpo completo", "MUSCLE_GAIN", 3)).toBe(
      "Cuerpo completo · Ganar masa muscular · 3 días"
    )
    expect(generatedPlanName("Superior / Inferior", "WEIGHT_LOSS", 4)).toBe(
      "Superior / Inferior · Perder peso · 4 días"
    )
  })

  it("«No estoy seguro» y forma física general dan el mismo nombre: «Mejorar forma física»", () => {
    expect(generatedPlanName("Cuerpo completo", "UNSURE", 3)).toBe(
      "Cuerpo completo · Mejorar forma física · 3 días"
    )
    expect(generatedPlanName("Cuerpo completo", "GENERAL_FITNESS", 3)).toBe(
      generatedPlanName("Cuerpo completo", "UNSURE", 3)
    )
  })
})
