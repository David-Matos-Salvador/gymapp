import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  bookingWindow,
  computeFreeSlots,
  DEFAULT_TIMEZONE,
  zonedTimeToUtc,
  type BusyInterval,
  type Slot,
} from "@/lib/coach-schedule"

type Db = Prisma.TransactionClient | typeof prisma

export interface FreeSlotsResult {
  timeZone: string
  slots: Slot[]
  /** false cuando el coach todavía no definió ninguna hora de atención. */
  hasAvailability: boolean
}

/**
 * Horas libres de un coach en la ventana de reserva. `db` puede ser una
 * transacción: así la reserva vuelve a calcularlas con el coach bloqueado.
 *
 * Incluye la caché de horas ocupadas del calendario externo del coach
 * (CalendarBusyBlock). Renovar esa caché es tarea de quien llama, antes y
 * fuera de la transacción: ver refreshCalendarCacheIfStale.
 */
export async function getFreeSlots(
  db: Db,
  trainer: { id: string; gymId: string },
  now: Date = new Date()
): Promise<FreeSlotsResult> {
  const gym = await db.gym.findUnique({
    where: { id: trainer.gymId },
    select: { timezone: true },
  })
  const timeZone = gym?.timezone || DEFAULT_TIMEZONE
  const { fromDate, days } = bookingWindow(now, timeZone)
  const windowEnd = zonedTimeToUtc(fromDate, days * 24 * 60, timeZone)

  const [availability, classes, appointments, calendarBlocks] = await Promise.all([
    db.coachAvailability.findMany({
      where: { trainerId: trainer.id },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    }),
    db.class.findMany({
      where: { trainerId: trainer.id, active: true },
      select: { dayOfWeek: true, startTime: true, duration: true },
    }),
    db.appointment.findMany({
      where: {
        trainerId: trainer.id,
        status: "CONFIRMED",
        // Una sesión que empezó antes de `now` todavía puede cruzarse con la primera hora libre.
        startsAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000), lt: windowEnd },
      },
      select: { startsAt: true, durationMinutes: true },
    }),
    // Aunque la conexión necesite reconectarse, sus últimos bloqueos conocidos siguen valiendo:
    // es preferible ocultar una hora de más que ofrecer una en la que el coach está ocupado.
    db.calendarBusyBlock.findMany({
      where: {
        connection: { trainerId: trainer.id },
        endsAt: { gt: now },
        startsAt: { lt: windowEnd },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ])

  const busy: BusyInterval[] = [
    ...appointments.map((item) => ({
      start: item.startsAt,
      end: new Date(item.startsAt.getTime() + item.durationMinutes * 60_000),
    })),
    ...calendarBlocks.map((item) => ({ start: item.startsAt, end: item.endsAt })),
  ]

  return {
    timeZone,
    hasAvailability: availability.length > 0,
    slots: computeFreeSlots({ fromDate, days, timeZone, availability, classes, busy, now }),
  }
}
