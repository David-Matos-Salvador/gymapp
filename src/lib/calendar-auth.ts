import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Usuario de la sesión si puede gestionar un calendario de coach; si no, la respuesta de error. */
export async function getCalendarCoach() {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.deletedAt || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) }
  }
  return { user }
}

export const OAUTH_STATE_COOKIE = "gcal_oauth_state"
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60
/** La cookie del estado solo viaja a las rutas del flujo de calendario. */
export const OAUTH_COOKIE_PATH = "/api/coach/calendar"
