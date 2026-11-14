import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCalendarCoach, OAUTH_COOKIE_PATH, OAUTH_STATE_COOKIE } from "@/lib/calendar-auth"
import { saveCalendarConnection, syncCalendar } from "@/lib/calendar-sync"
import {
  exchangeGoogleCode,
  getGoogleCalendarConfig,
  googleRedirectUri,
} from "@/lib/google-calendar"
import { logger } from "@/lib/logger"
import { publicOrigin } from "@/lib/public-url"
import { getRequestId } from "@/lib/request-id"

function sameState(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Google vuelve aquí con el código. Se valida el estado, se guarda el token cifrado y se sincroniza. */
export async function GET(request: Request) {
  const origin = publicOrigin(request)
  const finish = (result: string) => {
    const response = NextResponse.redirect(`${origin}/coach/schedule?calendar=${result}`)
    // El estado es de un solo uso.
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 })
    return response
  }

  const { user, error } = await getCalendarCoach()
  if (error) return NextResponse.redirect(`${origin}/login`)

  const config = getGoogleCalendarConfig()
  if (!config) return finish("unavailable")

  const params = new URL(request.url).searchParams
  const cookieStore = await cookies()
  if (!sameState(cookieStore.get(OAUTH_STATE_COOKIE)?.value, params.get("state"))) {
    return finish("error")
  }
  // El coach canceló en la pantalla de Google.
  if (params.get("error")) return finish("denied")

  const code = params.get("code")
  if (!code) return finish("error")

  try {
    const tokens = await exchangeGoogleCode({
      config,
      code,
      redirectUri: googleRedirectUri(origin),
    })
    await saveCalendarConnection(user.id, tokens.refreshToken)
  } catch (cause) {
    // Solo el tipo de error: el código y los tokens nunca van a los logs.
    logger.warn("Calendar connection failed", {
      requestId: getRequestId(request),
      context: { trainerId: user.id, reason: cause instanceof Error ? cause.name : "unknown" },
    })
    return finish("error")
  }

  // Si la primera lectura falla, la conexión queda guardada y se reintenta sola más tarde.
  await syncCalendar(user.id)
  return finish("connected")
}
