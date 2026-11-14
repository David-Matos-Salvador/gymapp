/**
 * Agenda 1:1 del coach: cálculo puro de horas libres.
 *
 * El coach define bloques semanales en la hora local de su gimnasio ("HH:mm").
 * Cada sesión se guarda como un instante UTC. Aquí no hay acceso a la base de
 * datos: los datos entran por parámetro, así la lógica se prueba sin mocks.
 */

export const SLOT_MINUTES = 60
/** Cuántos días hacia adelante puede reservar un cliente (incluye hoy). */
export const BOOKING_WINDOW_DAYS = 14
export const DEFAULT_TIMEZONE = "America/Lima"

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const
export type DayOfWeekName = (typeof DAYS_OF_WEEK)[number]

export const DAY_LABELS: Record<DayOfWeekName, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
}

export interface AvailabilityBlock {
  dayOfWeek: DayOfWeekName
  startTime: string
  endTime: string
}

/** Clase grupal semanal que dicta el coach: también ocupa su agenda. */
export interface WeeklyClass {
  dayOfWeek: DayOfWeekName
  startTime: string
  duration: number
}

/** Intervalo ocupado [start, end): sesiones ya reservadas o bloqueos de un calendario externo. */
export interface BusyInterval {
  start: Date
  end: Date
}

export interface Slot {
  /** Instante UTC en formato ISO. */
  startsAt: string
  /** Fecha local del gimnasio, "YYYY-MM-DD". */
  date: string
  /** Hora local del gimnasio, "HH:mm". */
  time: string
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value)
}

export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function timeToMinutes(value: string): number {
  const match = TIME_PATTERN.exec(value)
  if (!match) throw new Error(`Hora inválida: ${value}`)
  return Number(match[1]) * 60 + Number(match[2])
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

export function dayOfWeekOf(date: string): DayOfWeekName {
  // getUTCDay: 0 = domingo. DAYS_OF_WEEK empieza en lunes.
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return DAYS_OF_WEEK[(day + 6) % 7]
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  }
}

/** Diferencia en milisegundos entre la hora local de `timeZone` y UTC en ese instante. */
function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/** Convierte una fecha y hora locales del gimnasio al instante UTC correspondiente. */
export function zonedTimeToUtc(date: string, minutes: number, timeZone: string): Date {
  const wallClock = Date.parse(`${date}T00:00:00Z`) + minutes * 60_000
  const firstGuess = wallClock - offsetMs(new Date(wallClock), timeZone)
  // Segunda pasada: cerca de un cambio de horario el desfase del primer intento puede no ser el final.
  return new Date(wallClock - offsetMs(new Date(firstGuess), timeZone))
}

/** Fecha ("YYYY-MM-DD") y hora ("HH:mm") locales del gimnasio para un instante UTC. */
export function utcToZoned(instant: Date, timeZone: string): { date: string; time: string } {
  const p = zonedParts(instant, timeZone)
  const date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
  return { date, time: minutesToTime(p.hour * 60 + p.minute) }
}

/**
 * Valida los bloques semanales del coach. Devuelve el mensaje de error para el
 * usuario, o null si todo está bien.
 */
export function validateAvailability(blocks: AvailabilityBlock[]): string | null {
  for (const block of blocks) {
    if (!DAYS_OF_WEEK.includes(block.dayOfWeek)) return "Día de la semana inválido"
    if (!isValidTime(block.startTime) || !isValidTime(block.endTime)) {
      return "Usa horas con el formato HH:mm"
    }
    const start = timeToMinutes(block.startTime)
    const end = timeToMinutes(block.endTime)
    if (end <= start) return "La hora de fin debe ser posterior a la de inicio"
    if (end - start < SLOT_MINUTES) {
      return `Cada bloque debe durar al menos ${SLOT_MINUTES} minutos`
    }
  }

  for (const day of DAYS_OF_WEEK) {
    const sameDay = blocks
      .filter((block) => block.dayOfWeek === day)
      .map((block) => ({
        start: timeToMinutes(block.startTime),
        end: timeToMinutes(block.endTime),
      }))
      .sort((a, b) => a.start - b.start)
    for (let i = 1; i < sameDay.length; i++) {
      if (sameDay[i].start < sameDay[i - 1].end) {
        return `Tienes bloques que se cruzan el ${DAY_LABELS[day].toLowerCase()}`
      }
    }
  }

  return null
}

export function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.start < b.end && b.start < a.end
}

export interface ComputeSlotsInput {
  /** Primer día a revisar, fecha local del gimnasio. */
  fromDate: string
  days: number
  timeZone: string
  availability: AvailabilityBlock[]
  classes?: WeeklyClass[]
  busy?: BusyInterval[]
  now: Date
  slotMinutes?: number
}

/**
 * Horas libres del coach: su disponibilidad semanal menos las clases grupales
 * que dicta, las sesiones ya reservadas (u otros bloqueos) y las horas pasadas.
 */
export function computeFreeSlots(input: ComputeSlotsInput): Slot[] {
  const slotMinutes = input.slotMinutes ?? SLOT_MINUTES
  const slotMs = slotMinutes * 60_000
  const busy = input.busy ?? []
  const classes = input.classes ?? []
  const slots: Slot[] = []

  for (let offset = 0; offset < input.days; offset++) {
    const date = addDays(input.fromDate, offset)
    const day = dayOfWeekOf(date)

    const classIntervals: BusyInterval[] = classes
      .filter((item) => item.dayOfWeek === day && isValidTime(item.startTime))
      .map((item) => {
        const start = zonedTimeToUtc(date, timeToMinutes(item.startTime), input.timeZone)
        return { start, end: new Date(start.getTime() + item.duration * 60_000) }
      })

    const blocks = input.availability
      .filter((block) => block.dayOfWeek === day)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

    for (const block of blocks) {
      const blockEnd = timeToMinutes(block.endTime)
      for (
        let minutes = timeToMinutes(block.startTime);
        minutes + slotMinutes <= blockEnd;
        minutes += slotMinutes
      ) {
        const start = zonedTimeToUtc(date, minutes, input.timeZone)
        if (start <= input.now) continue
        const interval = { start, end: new Date(start.getTime() + slotMs) }
        if (busy.some((item) => overlaps(item, interval))) continue
        if (classIntervals.some((item) => overlaps(item, interval))) continue
        slots.push({ startsAt: start.toISOString(), date, time: minutesToTime(minutes) })
      }
    }
  }

  return slots
}

/** Primer y último día (fechas locales) que un cliente puede reservar hoy. */
export function bookingWindow(now: Date, timeZone: string): { fromDate: string; days: number } {
  return { fromDate: utcToZoned(now, timeZone).date, days: BOOKING_WINDOW_DAYS }
}

/** Texto corto para mostrar una sesión: "lunes 16 de noviembre, 09:00". */
export function formatAppointment(startsAt: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat("es-PE", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(startsAt)
  return `${day}, ${utcToZoned(startsAt, timeZone).time}`
}

/** Pregunta antes de reservar una sesión: dice con quién, qué día y a qué hora. */
export function bookAppointmentQuestion(day: string, time: string, coachName: string): string {
  return `¿Reservar sesión con ${coachName} el ${day} a las ${time}?`
}

/** Pregunta antes de cancelar una sesión: dice cuál es y que la otra persona recibe el aviso. */
export function cancelAppointmentQuestion(when: string, withName: string): string {
  return `¿Cancelar la sesión del ${when} con ${withName}? Se le avisará.`
}
