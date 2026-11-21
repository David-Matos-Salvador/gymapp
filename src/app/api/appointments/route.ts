import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { emitRealtime } from "@/lib/realtime"
import { getBookableCoach, hasActiveMembership } from "@/lib/appointments"
import { formatAppointment } from "@/lib/coach-schedule"
import { refreshCalendarCacheIfStale } from "@/lib/calendar-sync"
import { getFreeSlots } from "@/lib/coach-schedule-db"

const createSchema = z.object({ startsAt: z.iso.datetime() })

// Límites explícitos: un bloqueo trabado falla rápido en vez de colgar la petición.
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const

const APPOINTMENT_INCLUDE = {
  trainer: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
} as const

/** Próximas sesiones 1:1 del usuario, como cliente o como coach. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [{ clientId: user.id }, { trainerId: user.id }],
      status: "CONFIRMED",
      startsAt: { gte: new Date() },
    },
    include: APPOINTMENT_INCLUDE,
    orderBy: { startsAt: "asc" },
  })
  return NextResponse.json({ appointments })
}

/** El cliente reserva una hora libre con su coach. */
export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Elige una hora válida" }, { status: 400 })
  }
  const startsAt = new Date(parsed.data.startsAt)

  const lookup = await getBookableCoach(user)
  if (!lookup.ok) {
    return NextResponse.json({ error: lookup.error }, { status: lookup.status })
  }
  const coach = lookup.coach

  if (!(await hasActiveMembership(user.id))) {
    return NextResponse.json(
      { error: "Necesitas una membresía activa y confirmada para reservar una sesión" },
      { status: 403 }
    )
  }

  // Fuera de la transacción porque habla con Google: deja al día la caché del calendario del coach.
  await refreshCalendarCacheIfStale(coach.id)

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Bloqueo del coach: todas las reservas de su agenda pasan de una en una,
      // así dos clientes no pueden ver libre la misma hora al mismo tiempo.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${coach.id} FOR UPDATE`

      const { slots, timeZone } = await getFreeSlots(tx, coach)
      const slot = slots.find((item) => item.startsAt === startsAt.toISOString())
      if (!slot) {
        return { ok: false as const }
      }

      const appointment = await tx.appointment.create({
        data: { gymId: coach.gymId, trainerId: coach.id, clientId: user.id, startsAt },
        include: APPOINTMENT_INCLUDE,
      })
      await tx.notification.create({
        data: {
          userId: coach.id,
          title: "Nueva sesión 1:1",
          message: `${user.name || "Un cliente"} reservó una sesión contigo: ${formatAppointment(startsAt, timeZone)}.`,
          type: "CLASS",
          metadata: { appointmentId: appointment.id },
        },
      })
      return { ok: true as const, appointment }
    }, TRANSACTION_OPTIONS)

    if (!result.ok) {
      return NextResponse.json(
        { error: "Esa hora ya no está disponible. Elige otra." },
        { status: 409 }
      )
    }

    emitRealtime("notifications", coach.gymId)
    return NextResponse.json({ appointment: result.appointment }, { status: 201 })
  } catch (error) {
    logger.error("Appointment creation failed", {
      requestId,
      context: { route: "POST /api/appointments", trainerId: coach.id },
      error,
    })
    throw error
  }
}
