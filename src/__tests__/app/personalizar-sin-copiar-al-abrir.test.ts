import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import path from "path"

// #126: abrir «Personalizar» no debe crear ni asignar nada. La copia se pide solo desde
// la función que confirma con el coach, y el editor la llama antes del primer cambio.
const page = readFileSync(
  path.join(process.cwd(), "src/app/coach/clients/[id]/personalize/page.tsx"),
  "utf8"
)
const editor = readFileSync(
  path.join(process.cwd(), "src/components/coach/routine-editor-dialog.tsx"),
  "utf8"
)

describe("Pantalla «Personalizar» del coach", () => {
  it("al cargar solo consulta (GET), sin crear la copia", () => {
    const effect = page.slice(
      page.indexOf("useEffect(() => {"),
      page.indexOf("async function createCopy")
    )
    expect(effect).toContain("/api/routines/duplicate?")
    expect(effect).not.toContain("POST")
  })

  it("la copia se crea solo después de la confirmación", () => {
    const createCopy = page.slice(page.indexOf("async function createCopy"))
    const confirmAt = createCopy.indexOf("window.confirm(personalizeConfirmQuestion(clientName))")
    const postAt = createCopy.indexOf('method: "POST"')
    expect(confirmAt).toBeGreaterThan(-1)
    expect(postAt).toBeGreaterThan(confirmAt)
  })

  it("cada acción que guarda pasa antes por la copia", () => {
    const handlers = [
      "handleSavePlan",
      "handleSaveSplit",
      "handleDeleteSplit",
      "handleAddExercise",
      "handleDeleteExercise",
    ]
    for (const handler of handlers) {
      const start = editor.indexOf(`async function ${handler}(`)
      expect(start, handler).toBeGreaterThan(-1)
      const body = editor.slice(start, editor.indexOf("await fetch(", start))
      expect(body, handler).toContain("await editableTarget()")
    }
  })
})
