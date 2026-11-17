// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch } from "./helpers"

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }))
const update = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("next-auth/react", () => ({ useSession: () => ({ update }) }))

import { ChooseRoutineButton } from "@/components/rutina/choose-routine-button"

describe("ChooseRoutineButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reabre las recomendaciones y lleva al onboarding", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    render(<ChooseRoutineButton />)

    fireEvent.click(screen.getByRole("button", { name: "Elegir una rutina" }))

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/onboarding"))
    expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/reopen", { method: "POST" })
    expect(update).toHaveBeenCalledWith({ onboardingCompleted: false })
    expect(router.refresh).toHaveBeenCalled()
  })

  it("mientras trabaja dice «Abriendo...» y no deja tocar de nuevo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    )
    render(<ChooseRoutineButton />)

    fireEvent.click(screen.getByRole("button", { name: "Elegir una rutina" }))

    const button = (await screen.findByRole("button", { name: "Abriendo..." })) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("si la API falla, avisa y deja intentarlo otra vez", async () => {
    mockFetch(jsonResponse({ error: "x" }, 500))
    render(<ChooseRoutineButton />)

    fireEvent.click(screen.getByRole("button", { name: "Elegir una rutina" }))

    expect(
      await screen.findByText("No se pudieron abrir las recomendaciones. Inténtalo de nuevo.")
    ).toBeTruthy()
    const button = screen.getByRole("button", { name: "Elegir una rutina" }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
  })

  // Posible fallo: si se cae la conexión, `fetch` lanza y no hay try/catch; el botón se queda en
  // «Abriendo...» deshabilitado y sin aviso hasta recargar (choose-routine-button.tsx:18).
  it.todo("si se cae la conexión, avisa y deja intentarlo otra vez")
})
