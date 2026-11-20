// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jsonResponse, mockFetch, offlineFetch } from "./helpers"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))

vi.mock("sonner", () => ({ toast }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

import { CalendarConnectionCard } from "@/components/coach/calendar-connection-card"

type Connection = React.ComponentProps<typeof CalendarConnectionCard>["connection"]

const active: NonNullable<Connection> = {
  status: "ACTIVE",
  lastSync: "lunes 16 de noviembre, 09:15",
  busyCount: 3,
}

const DISCONNECT_QUESTION =
  "¿Desconectar tu calendario de Google? Las horas en las que estás ocupado ahí volverán a ofrecerse a tus clientes."

function renderCard(
  connection: Connection = active,
  notice: { tone: "ok" | "error"; text: string } | null = null
) {
  return render(<CalendarConnectionCard connection={connection} notice={notice} />)
}

describe("CalendarConnectionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sin conexión invita a conectar con un enlace normal a la ruta de Google", () => {
    renderCard(null)

    expect(screen.getByText("Sin conectar")).toBeTruthy()
    expect(screen.getByText(/nunca los títulos ni los detalles de tus eventos/)).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Conectar Google Calendar" }).getAttribute("href")
    ).toBe("/api/coach/calendar/connect")
    expect(screen.queryByRole("button", { name: /Sincronizar/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Desconectar/ })).toBeNull()
  })

  it("conectado muestra la última sincronización y cuántos bloqueos hay", () => {
    renderCard()

    expect(screen.getByText("Conectado")).toBeTruthy()
    expect(
      screen.getByText(
        "Última sincronización: lunes 16 de noviembre, 09:15. 3 bloqueos en los próximos días."
      )
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "Sincronizar ahora" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: /conectar/i })).toBeNull()
  })

  it("usa el singular con un solo bloqueo", () => {
    renderCard({ ...active, busyCount: 1 })

    expect(screen.getByText(/1 bloqueo en los próximos días\./)).toBeTruthy()
  })

  it("sin bloqueos dice que no hay horas ocupadas", () => {
    renderCard({ ...active, busyCount: 0 })

    expect(screen.getByText(/No tienes horas ocupadas en los próximos días\./)).toBeTruthy()
  })

  it("si todavía no se leyó el calendario, sugiere sincronizar y no habla de bloqueos", () => {
    renderCard({ ...active, lastSync: null, busyCount: 0 })

    expect(
      screen.getByText("Todavía no pudimos leer tu calendario. Prueba a sincronizar.")
    ).toBeTruthy()
    expect(screen.queryByText(/horas ocupadas/)).toBeNull()
  })

  it("si Google quitó el acceso, pide volver a conectar y deja desconectar", () => {
    renderCard({ ...active, status: "NEEDS_RECONNECT" })

    expect(screen.getByText("Hay que volver a conectar")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Volver a conectar" }).getAttribute("href")).toBe(
      "/api/coach/calendar/connect"
    )
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Sincronizar/ })).toBeNull()
  })

  it.each([
    ["ok", "Calendario conectado"],
    ["error", "No se pudo conectar tu calendario"],
  ] as const)("muestra el aviso «%s» que llega de la conexión", (tone, text) => {
    renderCard(null, { tone, text })

    expect(screen.getByRole("status").textContent).toBe(text)
  })

  it("sin aviso no hay mensaje de estado", () => {
    renderCard()

    expect(screen.queryByRole("status")).toBeNull()
  })

  it("sincronizar llama a la API, avisa y limpia la dirección", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar ahora" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Calendario sincronizado"))
    expect(fetchMock).toHaveBeenCalledWith("/api/coach/calendar/sync", { method: "POST" })
    expect(router.replace).toHaveBeenCalledWith("/coach/schedule")
    expect(router.refresh).toHaveBeenCalled()
  })

  it("mientras sincroniza, los dos botones quedan deshabilitados", async () => {
    let resolve: (value: Response) => void = () => {}
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((r) => (resolve = r)))
    )
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar ahora" }))

    expect(
      (await screen.findByRole("button", { name: "Sincronizando…" })) as HTMLButtonElement
    ).toHaveProperty("disabled", true)
    expect(screen.getByRole("button", { name: "Desconectar" })).toHaveProperty("disabled", true)
    resolve(jsonResponse({ ok: true }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sincronizar ahora" })).toHaveProperty(
        "disabled",
        false
      )
    )
  })

  it("si la sincronización falla, muestra el mensaje de la API", async () => {
    mockFetch(jsonResponse({ error: "Google no respondió, intenta en unos minutos" }, 502))
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar ahora" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Google no respondió, intenta en unos minutos")
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("si la sincronización falla sin mensaje, da uno genérico", async () => {
    mockFetch(jsonResponse({}, 500))
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar ahora" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No se pudo sincronizar"))
  })

  it("si se cae la conexión al sincronizar, avisa y deja reintentar", async () => {
    offlineFetch()
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar ahora" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No se pudo sincronizar"))
    expect(screen.getByRole("button", { name: "Sincronizar ahora" })).toHaveProperty(
      "disabled",
      false
    )
    expect(router.replace).not.toHaveBeenCalled()
  })

  it("desconectar pregunta antes; si se dice que no, no hace nada", () => {
    const fetchMock = mockFetch()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Desconectar" }))

    expect(confirm).toHaveBeenCalledWith(DISCONNECT_QUESTION)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ["conectado", active],
    ["por reconectar", { ...active, status: "NEEDS_RECONNECT" as const }],
  ])("al confirmar, desconecta el calendario %s", async (_, connection) => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderCard(connection)

    fireEvent.click(screen.getByRole("button", { name: "Desconectar" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Calendario desconectado"))
    expect(fetchMock).toHaveBeenCalledWith("/api/coach/calendar", { method: "DELETE" })
    expect(router.replace).toHaveBeenCalledWith("/coach/schedule")
    expect(router.refresh).toHaveBeenCalled()
  })

  it("si no se puede desconectar, da un mensaje genérico", async () => {
    mockFetch(jsonResponse({}, 500))
    vi.spyOn(window, "confirm").mockReturnValue(true)
    renderCard()

    fireEvent.click(screen.getByRole("button", { name: "Desconectar" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("No se pudo desconectar tu calendario")
    )
  })

  it.todo(
    "sin conexión dice «No se pudo sincronizar» / «No se pudo desconectar tu calendario», cuando " +
      "el resto de la app (#184) dice «Error de conexión»; decidir si se unifica " +
      "(calendar-connection-card.tsx:54)"
  )
})
