import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import {
  getCalendarCoach,
  OAUTH_COOKIE_PATH,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/lib/calendar-auth"
import {
  buildGoogleAuthUrl,
  getGoogleCalendarConfig,
  googleRedirectUri,
} from "@/lib/google-calendar"
import { publicOrigin } from "@/lib/public-url"

/** Inicia el flujo OAuth: lleva al coach a la pantalla de permiso de Google. */
export async function GET(request: Request) {
  const { error } = await getCalendarCoach()
  if (error) return error

  const config = getGoogleCalendarConfig()
  const origin = publicOrigin(request)
  if (!config) {
    return NextResponse.redirect(`${origin}/coach/schedule?calendar=unavailable`)
  }

  // El estado ata la respuesta de Google a este navegador (protección contra CSRF).
  const state = randomBytes(32).toString("base64url")
  const response = NextResponse.redirect(
    buildGoogleAuthUrl({ config, redirectUri: googleRedirectUri(origin), state })
  )
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  })
  return response
}
