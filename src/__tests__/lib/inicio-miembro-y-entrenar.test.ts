import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import { formatSplitTitle } from "@/lib/split-title"

// Issue #217: «Siguiente entrenamiento: A: Torso / Piernas - A», tarjeta del coach que parecía
// tocable sin llevar a nada y la pantalla de entrenar sin <main>.
const leer = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), "utf8")

describe("formatSplitTitle", () => {
  it("antepone la letra cuando el nombre no la trae", () => {
    expect(formatSplitTitle("A", "Pecho y tríceps")).toBe("A: Pecho y tríceps")
    expect(formatSplitTitle("B", "Espalda", " · ")).toBe("B · Espalda")
  })

  it("no repite la letra si el nombre ya termina o empieza con ella", () => {
    expect(formatSplitTitle("A", "Torso / Piernas - A")).toBe("Torso / Piernas - A")
    expect(formatSplitTitle("B", "Full Body (B)")).toBe("Full Body (B)")
    expect(formatSplitTitle("C", "Día C")).toBe("Día C")
    expect(formatSplitTitle("A", "A: Empuje")).toBe("A: Empuje")
    expect(formatSplitTitle("a", "Torso - A")).toBe("Torso - A")
  })

  it("no confunde la letra con el comienzo de una palabra", () => {
    expect(formatSplitTitle("A", "Abdominales")).toBe("A: Abdominales")
    expect(formatSplitTitle("B", "Piernas Básicas")).toBe("B: Piernas Básicas")
  })
})

describe("inicio del miembro", () => {
  it("la tarjeta sin enlace no se ve tocable", () => {
    const fuente = leer("src/components/ui/stat-card.tsx")
    expect(fuente).toContain(
      '(href || onClick) && "cursor-pointer transition-shadow hover:shadow-md"'
    )
  })

  it("sin coach, la tarjeta explica cómo conseguir uno", () => {
    const fuente = leer("src/components/dashboard/member-dashboard.tsx")
    expect(fuente).toContain("Un coach del gimnasio te enviará una solicitud")
    expect(fuente).toContain('href={coach.hasCoach ? "/sessions" : undefined}')
  })
})

describe("pantalla de entrenar", () => {
  it("tiene la región principal <main>", () => {
    const fuente = leer("src/app/my-routine/[planId]/workout/[splitId]/workout-client.tsx")
    expect(fuente).toMatch(/<main\s/)
    expect(fuente).toContain("</main>")
  })
})
