import { NextResponse } from "next/server"
import { getCalendarCoach } from "@/lib/calendar-auth"
import { syncCalendar } from "@/lib/calendar-sync"

const RESPONSES = {
  synced: { status: 200, body: { success: true } },
  needs_reconnect: {
    status: 409,
    body: { error: "Google ya no nos da acceso a tu calendario. Vuelve a conectarlo." },
  },
  failed: {
    status: 502,
    body: { error: "No pudimos leer tu calendario de Google. Intenta de nuevo en unos minutos." },
  },
  not_connected: { status: 404, body: { error: "No tienes un calendario conectado" } },
  disabled: { status: 404, body: { error: "La conexión con Google Calendar no está disponible" } },
} as const

/** El coach pide leer su calendario ahora, sin esperar a que venza la caché. */
export async function POST() {
  const { user, error } = await getCalendarCoach()
  if (error) return error

  const result = RESPONSES[await syncCalendar(user.id)]
  return NextResponse.json(result.body, { status: result.status })
}
