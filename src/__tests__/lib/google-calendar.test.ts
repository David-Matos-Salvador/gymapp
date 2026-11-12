import { randomBytes } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleCalendarConfig,
  GOOGLE_FREEBUSY_SCOPE,
  GoogleAuthRevokedError,
  GoogleCalendarError,
  googleRedirectUri,
  parseFreeBusy,
  queryGoogleFreeBusy,
  refreshGoogleAccessToken,
  revokeGoogleToken,
} from "@/lib/google-calendar"

const config = { clientId: "client-id", clientSecret: "client-secret" }
const mockFetch = vi.fn()

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal("fetch", mockFetch)
})
afterEach(() => vi.unstubAllGlobals())

describe("configuración", () => {
  const full = {
    GOOGLE_CALENDAR_CLIENT_ID: "id",
    GOOGLE_CALENDAR_CLIENT_SECRET: "secret",
    CALENDAR_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  }

  it("solo está activa con las tres variables y una llave válida", () => {
    expect(getGoogleCalendarConfig(full)).toEqual({ clientId: "id", clientSecret: "secret" })
    expect(getGoogleCalendarConfig({})).toBeNull()
    expect(getGoogleCalendarConfig({ ...full, GOOGLE_CALENDAR_CLIENT_SECRET: "" })).toBeNull()
    expect(getGoogleCalendarConfig({ ...full, CALENDAR_TOKEN_ENCRYPTION_KEY: "corta" })).toBeNull()
  })

  it("arma la URI de redirección sobre el origen público", () => {
    expect(googleRedirectUri("https://gym-qa.davidmatos.lat")).toBe(
      "https://gym-qa.davidmatos.lat/api/coach/calendar/callback"
    )
  })
})

describe("buildGoogleAuthUrl", () => {
  it("pide solo free/busy, acceso offline y lleva el estado", () => {
    const url = new URL(
      buildGoogleAuthUrl({ config, redirectUri: "https://app.test/cb", state: "estado-123" })
    )
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth")
    expect(url.searchParams.get("scope")).toBe(GOOGLE_FREEBUSY_SCOPE)
    expect(url.searchParams.get("access_type")).toBe("offline")
    expect(url.searchParams.get("prompt")).toBe("consent")
    expect(url.searchParams.get("state")).toBe("estado-123")
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.test/cb")
    // El secreto del cliente nunca viaja en la URL del navegador.
    expect(url.toString()).not.toContain("client-secret")
  })
})

describe("exchangeGoogleCode", () => {
  const input = { config, code: "codigo", redirectUri: "https://app.test/cb" }

  it("devuelve los tokens cuando Google concede el alcance", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        access_token: "access",
        refresh_token: "refresh",
        scope: `openid ${GOOGLE_FREEBUSY_SCOPE}`,
      })
    )
    expect(await exchangeGoogleCode(input)).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
    })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("https://oauth2.googleapis.com/token")
    expect(init.method).toBe("POST")
    expect(new URLSearchParams(init.body).get("grant_type")).toBe("authorization_code")
  })

  it("falla si el coach desmarcó el permiso de disponibilidad", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { access_token: "a", refresh_token: "r", scope: "openid" })
    )
    await expect(exchangeGoogleCode(input)).rejects.toThrow(GoogleCalendarError)
  })

  it("falla si Google no entrega refresh token", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { access_token: "a", scope: GOOGLE_FREEBUSY_SCOPE })
    )
    await expect(exchangeGoogleCode(input)).rejects.toThrow(GoogleCalendarError)
  })

  it("no copia el cuerpo de la respuesta de Google en el error", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(400, { error: "invalid_client", error_description: "dato-sensible" })
    )
    await expect(exchangeGoogleCode(input)).rejects.toThrow(/Google respondió 400/)
    await expect(exchangeGoogleCode(input)).rejects.not.toThrow(/dato-sensible/)
  })
})

describe("refreshGoogleAccessToken", () => {
  it("devuelve un access token nuevo", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { access_token: "nuevo" }))
    expect(await refreshGoogleAccessToken(config, "refresh")).toBe("nuevo")
    expect(new URLSearchParams(mockFetch.mock.calls[0][1].body).get("grant_type")).toBe(
      "refresh_token"
    )
  })

  it("distingue el acceso revocado (invalid_grant) de otros fallos", async () => {
    mockFetch.mockResolvedValue(jsonResponse(400, { error: "invalid_grant" }))
    await expect(refreshGoogleAccessToken(config, "refresh")).rejects.toThrow(
      GoogleAuthRevokedError
    )
    mockFetch.mockResolvedValue(jsonResponse(503, {}))
    await expect(refreshGoogleAccessToken(config, "refresh")).rejects.toThrow(GoogleCalendarError)
  })

  it("convierte un fallo de red en un error controlado", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"))
    await expect(refreshGoogleAccessToken(config, "refresh")).rejects.toThrow(
      "No se pudo contactar a Google"
    )
  })
})

describe("revokeGoogleToken", () => {
  it("devuelve si Google aceptó la revocación, sin lanzar errores", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }))
    expect(await revokeGoogleToken("token")).toBe(true)
    mockFetch.mockResolvedValue(new Response(null, { status: 400 }))
    expect(await revokeGoogleToken("token")).toBe(false)
    mockFetch.mockRejectedValue(new Error("sin red"))
    expect(await revokeGoogleToken("token")).toBe(false)
  })
})

describe("parseFreeBusy", () => {
  it("convierte los intervalos, también con desfase horario", () => {
    const busy = parseFreeBusy(
      {
        calendars: {
          primary: {
            busy: [
              { start: "2026-11-16T14:00:00Z", end: "2026-11-16T15:00:00Z" },
              { start: "2026-11-17T09:00:00-05:00", end: "2026-11-17T10:30:00-05:00" },
            ],
          },
        },
      },
      "primary"
    )
    expect(busy).toEqual([
      { start: new Date("2026-11-16T14:00:00Z"), end: new Date("2026-11-16T15:00:00Z") },
      { start: new Date("2026-11-17T14:00:00Z"), end: new Date("2026-11-17T15:30:00Z") },
    ])
  })

  it("ignora entradas mal formadas, invertidas o vacías", () => {
    const busy = parseFreeBusy(
      {
        calendars: {
          primary: {
            busy: [
              { start: "no-es-fecha", end: "2026-11-16T15:00:00Z" },
              { start: "2026-11-16T15:00:00Z", end: "2026-11-16T14:00:00Z" },
              { start: "2026-11-16T15:00:00Z" },
              null,
            ],
          },
        },
      },
      "primary"
    )
    expect(busy).toEqual([])
    expect(parseFreeBusy({ calendars: { primary: {} } }, "primary")).toEqual([])
  })

  it("falla si falta el calendario o Google reporta un error en él", () => {
    expect(() => parseFreeBusy({ calendars: {} }, "primary")).toThrow(GoogleCalendarError)
    expect(() => parseFreeBusy(null, "primary")).toThrow(GoogleCalendarError)
    expect(() =>
      parseFreeBusy({ calendars: { primary: { errors: [{ reason: "notFound" }] } } }, "primary")
    ).toThrow(GoogleCalendarError)
  })
})

describe("queryGoogleFreeBusy", () => {
  const input = {
    accessToken: "access",
    calendarId: "primary",
    timeMin: new Date("2026-11-16T00:00:00Z"),
    timeMax: new Date("2026-11-30T00:00:00Z"),
  }

  it("consulta solo free/busy del calendario indicado", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { calendars: { primary: { busy: [] } } }))
    expect(await queryGoogleFreeBusy(input)).toEqual([])
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("https://www.googleapis.com/calendar/v3/freeBusy")
    expect(init.headers.Authorization).toBe("Bearer access")
    expect(JSON.parse(init.body)).toEqual({
      timeMin: "2026-11-16T00:00:00.000Z",
      timeMax: "2026-11-30T00:00:00.000Z",
      items: [{ id: "primary" }],
    })
  })

  it("trata el 401 como acceso revocado y el resto como fallo temporal", async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, {}))
    await expect(queryGoogleFreeBusy(input)).rejects.toThrow(GoogleAuthRevokedError)
    mockFetch.mockResolvedValue(jsonResponse(429, {}))
    await expect(queryGoogleFreeBusy(input)).rejects.toThrow(GoogleCalendarError)
  })
})
