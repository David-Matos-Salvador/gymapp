import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBookableCoach } from "@/lib/appointments"
import { refreshCalendarCacheIfStale } from "@/lib/calendar-sync"
import { getFreeSlots } from "@/lib/coach-schedule-db"

/** Horas libres del coach asignado al usuario, para los próximos días. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const lookup = await getBookableCoach(user)
  if (!lookup.ok) {
    return NextResponse.json({ error: lookup.error }, { status: lookup.status })
  }

  await refreshCalendarCacheIfStale(lookup.coach.id)
  const result = await getFreeSlots(prisma, lookup.coach)
  return NextResponse.json({
    coach: { id: lookup.coach.id, name: lookup.coach.name },
    ...result,
  })
}
