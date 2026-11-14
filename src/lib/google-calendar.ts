import { parseEncryptionKey } from "@/lib/calendar-crypto"
import type { BusyInterval } from "@/lib/coach-schedule"

/**
 * Cliente mínimo de Google para la agenda del coach: OAuth 2.0 y free/busy.
 * Solo lectura y solo "ocupado/libre": nunca se piden títulos ni detalles de eventos.
 * Este módulo no toca la base de datos ni escribe tokens en los logs.
 */

/** Alcance mínimo que permite consultar free/busy. */
export const GOOGLE_FREEBUSY_SCOPE = "https://www.googleapis.com/auth/calendar.freebusy"
export const GOOGLE_CALLBACK_PATH = "/api/coach/calendar/callback"

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const REVOKE_URL = "https://oauth2.googleapis.com/revoke"
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy"
const REQUEST_TIMEOUT_MS = 8_000

type EnvSource = Record<string, string | undefined>

export interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
}

/** null si la integración no está configurada en este ambiente: la app funciona igual sin ella. */
export function getGoogleCalendarConfig(env: EnvSource = process.env): GoogleCalendarConfig | null {
  const clientId = env.GOOGLE_CALENDAR_CLIENT_ID?.trim()
  const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  if (!parseEncryptionKey(env.CALENDAR_TOKEN_ENCRYPTION_KEY)) return null
  return { clientId, clientSecret }
}

export function isGoogleCalendarEnabled(env: EnvSource = process.env): boolean {
  return getGoogleCalendarConfig(env) !== null
}

export function googleRedirectUri(origin: string): string {
  return `${origin}${GOOGLE_CALLBACK_PATH}`
}

/** El proveedor rechazó la credencial: el coach revocó el acceso o el token venció. */
export class GoogleAuthRevokedError extends Error {
  constructor() {
    super("Google rechazó la credencial guardada")
    this.name = "GoogleAuthRevokedError"
  }
}

/** Cualquier otro fallo de Google (caído, límite de uso, respuesta inesperada). */
export class GoogleCalendarError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GoogleCalendarError"
  }
}

export function buildGoogleAuthUrl(input: {
  config: GoogleCalendarConfig
  redirectUri: string
  state: string
}): string {
  const url = new URL(AUTH_URL)
  url.search = new URLSearchParams({
    client_id: input.config.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GOOGLE_FREEBUSY_SCOPE,
    // offline + consent: Google solo entrega refresh token si se pide así.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state: input.state,
  }).toString()
  return url.toString()
}

async function googleFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch {
    throw new GoogleCalendarError("No se pudo contactar a Google")
  }
}

async function tokenRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await googleFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    if (data.error === "invalid_grant") throw new GoogleAuthRevokedError()
    // Solo el código de error: el cuerpo podría traer datos sensibles.
    throw new GoogleCalendarError(`Google respondió ${response.status} al pedir el token`)
  }
  return data
}

/** Cambia el código del callback por tokens. Exige refresh token y el alcance de free/busy. */
export async function exchangeGoogleCode(input: {
  config: GoogleCalendarConfig
  code: string
  redirectUri: string
}): Promise<{ refreshToken: string; accessToken: string }> {
  const data = await tokenRequest({
    grant_type: "authorization_code",
    code: input.code,
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    redirect_uri: input.redirectUri,
  })
  const scopes = typeof data.scope === "string" ? data.scope.split(" ") : []
  if (!scopes.includes(GOOGLE_FREEBUSY_SCOPE)) {
    throw new GoogleCalendarError("Google no concedió el permiso de disponibilidad")
  }
  if (typeof data.refresh_token !== "string" || typeof data.access_token !== "string") {
    throw new GoogleCalendarError("Google no entregó las credenciales esperadas")
  }
  return { refreshToken: data.refresh_token, accessToken: data.access_token }
}

/** Los access tokens duran poco y no se guardan: se pide uno nuevo en cada sincronización. */
export async function refreshGoogleAccessToken(
  config: GoogleCalendarConfig,
  refreshToken: string
): Promise<string> {
  const data = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })
  if (typeof data.access_token !== "string") {
    throw new GoogleCalendarError("Google no entregó las credenciales esperadas")
  }
  return data.access_token
}

/** Revoca el acceso en Google. Devuelve false si no se pudo: desconectar sigue adelante igual. */
export async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await googleFetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Convierte la respuesta de freeBusy en intervalos. Ignora entradas mal formadas o vacías. */
export function parseFreeBusy(data: unknown, calendarId: string): BusyInterval[] {
  const calendar = (data as { calendars?: Record<string, { busy?: unknown; errors?: unknown }> })
    ?.calendars?.[calendarId]
  if (!calendar)
    throw new GoogleCalendarError("Google no devolvió la disponibilidad del calendario")
  if (Array.isArray(calendar.errors) && calendar.errors.length > 0) {
    throw new GoogleCalendarError("Google no pudo leer la disponibilidad del calendario")
  }
  if (!Array.isArray(calendar.busy)) return []

  const intervals: BusyInterval[] = []
  for (const item of calendar.busy as Array<{ start?: unknown; end?: unknown }>) {
    if (typeof item?.start !== "string" || typeof item?.end !== "string") continue
    const start = new Date(item.start)
    const end = new Date(item.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue
    intervals.push({ start, end })
  }
  return intervals
}

/** Intervalos ocupados del calendario entre dos instantes. Google ya excluye los eventos marcados como "libre". */
export async function queryGoogleFreeBusy(input: {
  accessToken: string
  calendarId: string
  timeMin: Date
  timeMax: Date
}): Promise<BusyInterval[]> {
  const response = await googleFetch(FREEBUSY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: input.timeMin.toISOString(),
      timeMax: input.timeMax.toISOString(),
      items: [{ id: input.calendarId }],
    }),
  })
  if (response.status === 401) throw new GoogleAuthRevokedError()
  if (!response.ok) {
    throw new GoogleCalendarError(`Google respondió ${response.status} al leer la disponibilidad`)
  }
  return parseFreeBusy(await response.json().catch(() => null), input.calendarId)
}
