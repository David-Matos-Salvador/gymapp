import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockExchange = vi.fn()
const mockSave = vi.fn()
const mockSync = vi.fn()
const mockDisconnect = vi.fn()
const mockCookieGet = vi.fn()
const mockWarn = vi.fn()

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) } },
}))
vi.mock("@/lib/logger", () => ({ logger: { warn: (...args: unknown[]) => mockWarn(...args) } }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => mockCookieGet(name) }),
}))
vi.mock("@/lib/calendar-sync", () => ({
  saveCalendarConnection: (...args: unknown[]) => mockSave(...args),
  syncCalendar: (...args: unknown[]) => mockSync(...args),
  disconnectCalendar: (...args: unknown[]) => mockDisconnect(...args),
}))
vi.mock("@/lib/google-calendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/google-calendar")>()),
  exchangeGoogleCode: (...args: unknown[]) => mockExchange(...args),
}))

import { GET as connect } from "@/app/api/coach/calendar/connect/route"
import { GET as callback } from "@/app/api/coach/calendar/callback/route"
import { POST as sync } from "@/app/api/coach/calendar/sync/route"
import { DELETE as disconnect } from "@/app/api/coach/calendar/route"
import { GoogleCalendarError } from "@/lib/google-calendar"

const ORIGIN = "https://gym.test"
const coach = { id: "coach-1", role: "TRAINER", deletedAt: null }
const STATE = "estado-de-prueba"

function callbackRequest(query: string) {
  return new Request(`http://0.0.0.0:3000/api/coach/calendar/callback?${query}`)
}

function location(response: Response) {
  return response.headers.get("location")
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("AUTH_URL", ORIGIN)
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client-id")
  vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret")
  vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"))
  mockAuth.mockResolvedValue({ user: { email: "coach@test.com" } })
  mockUserFindUnique.mockResolvedValue(coach)
  mockCookieGet.mockReturnValue({ value: STATE })
  mockExchange.mockResolvedValue({ refreshToken: "refresh-secreto", accessToken: "access" })
  mockSync.mockResolvedValue("synced")
})

describe("GET /api/coach/calendar/connect", () => {
  const request = () => new Request("http://0.0.0.0:3000/api/coach/calendar/connect")

  it("solo deja entrar a coaches con sesión", async () => {
    mockAuth.mockResolvedValue(null)
    expect((await connect(request())).status).toBe(401)

    mockAuth.mockResolvedValue({ user: { email: "miembro@test.com" } })
    mockUserFindUnique.mockResolvedValue({ ...coach, role: "MEMBER" })
    expect((await connect(request())).status).toBe(403)
  })

  it("redirige a Google con el dominio público y guarda el estado en una cookie httpOnly", async () => {
    const response = await connect(request())
    expect(response.status).toBe(307)

    const url = new URL(location(response)!)
    expect(url.hostname).toBe("accounts.google.com")
    // Usa el dominio público, no la dirección interna del contenedor.
    expect(url.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/coach/calendar/callback`)

    const cookie = response.headers.get("set-cookie")!
    const state = url.searchParams.get("state")!
    expect(state.length).toBeGreaterThanOrEqual(32)
    expect(cookie).toContain(`gcal_oauth_state=${state}`)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/Secure/i)
    expect(cookie).toMatch(/SameSite=lax/i)
    expect(cookie).toContain("Path=/api/coach/calendar")
  })

  it("si la integración no está configurada, vuelve a la agenda con un aviso", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "")
    const response = await connect(request())
    expect(location(response)).toBe(`${ORIGIN}/coach/schedule?calendar=unavailable`)
  })
})

describe("GET /api/coach/calendar/callback", () => {
  it("guarda la conexión del coach de la sesión y sincroniza", async () => {
    const response = await callback(callbackRequest(`state=${STATE}&code=codigo-123`))

    expect(location(response)).toBe(`${ORIGIN}/coach/schedule?calendar=connected`)
    expect(mockExchange.mock.calls[0][0]).toMatchObject({
      code: "codigo-123",
      redirectUri: `${ORIGIN}/api/coach/calendar/callback`,
    })
    expect(mockSave).toHaveBeenCalledWith("coach-1", "refresh-secreto")
    expect(mockSync).toHaveBeenCalledWith("coach-1")
    // El estado es de un solo uso: la cookie se borra.
    expect(response.headers.get("set-cookie")).toMatch(/gcal_oauth_state=;.*Max-Age=0/i)
  })

  it("rechaza un estado que no coincide con la cookie (CSRF)", async () => {
    for (const query of ["state=otro-estado&code=codigo", "code=codigo"]) {
      const response = await callback(callbackRequest(query))
      expect(location(response)).toBe(`${ORIGIN}/coach/schedule?calendar=error`)
    }
    mockCookieGet.mockReturnValue(undefined)
    const response = await callback(callbackRequest(`state=${STATE}&code=codigo`))
    expect(location(response)).toBe(`${ORIGIN}/coach/schedule?calendar=error`)

    expect(mockExchange).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("si el coach cancela en Google, no guarda nada", async () => {
    const response = await callback(callbackRequest(`state=${STATE}&error=access_denied`))
    expect(location(response)).toBe(`${ORIGIN}/coach/schedule?calendar=denied`)
    expect(mockExchange).not.toHaveBeenCalled()
  })

  it("si Google rechaza el código, avisa sin registrar el código ni los tokens", async () => {
    mockExchange.mockRejectedValue(new GoogleCalendarError("Google respondió 400"))
    const response = await callback(callbackRequest(`state=${STATE}&code=codigo-123`))

    expect(location(response)).toBe(`${ORIGIN}/coach/schedule?calendar=error`)
    expect(mockSave).not.toHaveBeenCalled()
    expect(JSON.stringify(mockWarn.mock.calls)).not.toContain("codigo-123")
  })

  it("sin sesión de coach manda al login y no canjea el código", async () => {
    mockAuth.mockResolvedValue(null)
    const response = await callback(callbackRequest(`state=${STATE}&code=codigo`))
    expect(location(response)).toBe(`${ORIGIN}/login`)
    expect(mockExchange).not.toHaveBeenCalled()
  })

  it("la conexión queda guardada aunque la primera lectura falle", async () => {
    mockSync.mockResolvedValue("failed")
    const response = await callback(callbackRequest(`state=${STATE}&code=codigo`))
    expect(location(response)).toBe(`${ORIGIN}/coach/schedule?calendar=connected`)
    expect(mockSave).toHaveBeenCalled()
  })
})

describe("POST /api/coach/calendar/sync", () => {
  it("traduce el resultado de la sincronización", async () => {
    const cases = [
      ["synced", 200],
      ["needs_reconnect", 409],
      ["failed", 502],
      ["not_connected", 404],
      ["disabled", 404],
    ] as const
    for (const [result, status] of cases) {
      mockSync.mockResolvedValue(result)
      expect((await sync()).status).toBe(status)
    }
    expect(mockSync).toHaveBeenCalledWith("coach-1")
  })

  it("no deja sincronizar a un miembro", async () => {
    mockUserFindUnique.mockResolvedValue({ ...coach, role: "MEMBER" })
    expect((await sync()).status).toBe(403)
    expect(mockSync).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/coach/calendar", () => {
  it("desconecta solo el calendario del coach de la sesión", async () => {
    mockDisconnect.mockResolvedValue(true)
    expect((await disconnect()).status).toBe(200)
    expect(mockDisconnect).toHaveBeenCalledWith("coach-1")
  })

  it("responde 404 si no había nada conectado", async () => {
    mockDisconnect.mockResolvedValue(false)
    expect((await disconnect()).status).toBe(404)
  })

  it("exige sesión", async () => {
    mockAuth.mockResolvedValue(null)
    expect((await disconnect()).status).toBe(401)
    expect(mockDisconnect).not.toHaveBeenCalled()
  })
})
