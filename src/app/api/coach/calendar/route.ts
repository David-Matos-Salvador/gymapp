import { NextResponse } from "next/server"
import { getCalendarCoach } from "@/lib/calendar-auth"
import { disconnectCalendar } from "@/lib/calendar-sync"

/** Desconecta el calendario: revoca el acceso en Google y borra la credencial y la caché. */
export async function DELETE() {
  const { user, error } = await getCalendarCoach()
  if (error) return error

  const removed = await disconnectCalendar(user.id)
  if (!removed) {
    return NextResponse.json({ error: "No tienes un calendario conectado" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
