import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  addDays,
  bookingWindow,
  bookAppointmentQuestion,
  cancelAppointmentQuestion,
  computeFreeSlots,
  dayOfWeekOf,
  formatAppointment,
  isValidDate,
  isValidTime,
  overlaps,
  utcToZoned,
  validateAvailability,
  zonedTimeToUtc,
  type AvailabilityBlock,
} from "@/lib/coach-schedule"

const LIMA = "America/Lima"
// Lunes 16 de noviembre de 2026.
const MONDAY = "2026-11-16"
const BEFORE = new Date("2026-11-15T12:00:00Z")

const mondayMorning: AvailabilityBlock[] = [
  { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "12:00" },
]

describe("fechas y horas", () => {
  it("valida horas y fechas", () => {
    expect(isValidTime("09:00")).toBe(true)
    expect(isValidTime("24:00")).toBe(false)
    expect(isValidTime("9:00")).toBe(false)
    expect(isValidDate("2026-11-16")).toBe(true)
    expect(isValidDate("2026-02-30")).toBe(false)
    expect(isValidDate("16/11/2026")).toBe(false)
  })

  it("calcula el día de la semana y suma días", () => {
    expect(dayOfWeekOf(MONDAY)).toBe("MONDAY")
    expect(dayOfWeekOf("2026-11-22")).toBe("SUNDAY")
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
  })

  it("convierte la hora de Lima a UTC (UTC-5, sin cambio de horario)", () => {
    expect(zonedTimeToUtc(MONDAY, 9 * 60, LIMA).toISOString()).toBe("2026-11-16T14:00:00.000Z")
    // 20:00 en Lima ya es el día siguiente en UTC.
    expect(zonedTimeToUtc(MONDAY, 20 * 60, LIMA).toISOString()).toBe("2026-11-17T01:00:00.000Z")
  })

  it("respeta el cambio de horario en zonas que lo tienen", () => {
    const tz = "America/Santiago"
    // Invierno (UTC-4) y verano (UTC-3).
    expect(zonedTimeToUtc("2026-07-01", 9 * 60, tz).toISOString()).toBe("2026-07-01T13:00:00.000Z")
    expect(zonedTimeToUtc("2026-12-01", 9 * 60, tz).toISOString()).toBe("2026-12-01T12:00:00.000Z")
  })

  it("convierte de UTC a la hora local del gimnasio", () => {
    expect(utcToZoned(new Date("2026-11-17T01:00:00Z"), LIMA)).toEqual({
      date: MONDAY,
      time: "20:00",
    })
  })

  it("la ventana de reserva empieza en el día local, no en el día UTC", () => {
    // 02:00 UTC del martes todavía es lunes en Lima.
    expect(bookingWindow(new Date("2026-11-17T02:00:00Z"), LIMA)).toEqual({
      fromDate: MONDAY,
      days: 14,
    })
  })

  it("describe una sesión en español con la hora local", () => {
    const text = formatAppointment(new Date("2026-11-16T14:00:00Z"), LIMA)
    expect(text).toContain("lunes")
    expect(text).toContain("16 de noviembre")
    expect(text).toContain("09:00")
  })
})

// Issue #85: un toque en Cancelar cancelaba la sesión y avisaba a la otra persona, sin preguntar.
describe("cancelar una sesión pide confirmación", () => {
  it("la pregunta dice qué sesión es y que la otra persona recibe el aviso", () => {
    expect(cancelAppointmentQuestion("lunes 16 de noviembre, 09:00", "Coach Martínez")).toBe(
      "¿Cancelar la sesión del lunes 16 de noviembre, 09:00 con Coach Martínez? Se le avisará."
    )
  })

  it("la lista de sesiones pregunta antes de llamar a la API", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/sessions/appointment-list.tsx"),
      "utf8"
    )
    const question = source.indexOf("window.confirm(cancelAppointmentQuestion(")
    expect(question).toBeGreaterThan(-1)
    expect(question).toBeLessThan(source.indexOf("fetch("))
  })
})

// Issue #109: un toque en una hora libre reservaba la sesión al instante, sin preguntar.
describe("reservar una sesión pide confirmación", () => {
  it("la pregunta dice con quién, qué día y a qué hora", () => {
    expect(bookAppointmentQuestion("lunes, 16 de noviembre", "09:00", "Coach Martínez")).toBe(
      "¿Reservar sesión con Coach Martínez el lunes, 16 de noviembre a las 09:00?"
    )
  })

  it("la lista de horas pregunta antes de llamar a la API", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/sessions/slot-picker.tsx"),
      "utf8"
    )
    const question = source.indexOf("window.confirm(bookAppointmentQuestion(")
    expect(question).toBeGreaterThan(-1)
    expect(question).toBeLessThan(source.indexOf("fetch("))
  })

  it("la página le pasa el nombre del coach a la lista de horas", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/sessions/page.tsx"), "utf8")
    expect(source).toContain('coachName={lookup.coach.name || "tu coach"}')
  })
})

describe("validateAvailability", () => {
  it("acepta bloques correctos, también varios en un mismo día", () => {
    expect(
      validateAvailability([
        ...mondayMorning,
        { dayOfWeek: "MONDAY", startTime: "15:00", endTime: "18:00" },
        { dayOfWeek: "FRIDAY", startTime: "07:00", endTime: "08:00" },
      ])
    ).toBeNull()
    expect(validateAvailability([])).toBeNull()
  })

  it("rechaza horas mal escritas", () => {
    expect(validateAvailability([{ dayOfWeek: "MONDAY", startTime: "9", endTime: "12:00" }])).toBe(
      "Usa horas con el formato HH:mm"
    )
  })

  it("rechaza un fin anterior o igual al inicio", () => {
    expect(
      validateAvailability([{ dayOfWeek: "MONDAY", startTime: "12:00", endTime: "09:00" }])
    ).toBe("La hora de fin debe ser posterior a la de inicio")
  })

  it("rechaza bloques donde no cabe una sesión", () => {
    expect(
      validateAvailability([{ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "09:30" }])
    ).toBe("Cada bloque debe durar al menos 60 minutos")
  })

  it("rechaza bloques que se cruzan el mismo día", () => {
    expect(
      validateAvailability([
        ...mondayMorning,
        { dayOfWeek: "MONDAY", startTime: "11:00", endTime: "13:00" },
      ])
    ).toBe("Tienes bloques que se cruzan el lunes")
  })
})

describe("overlaps", () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 10, 16, hour))

  it("detecta cruces y deja pasar intervalos que solo se tocan", () => {
    expect(overlaps({ start: at(9), end: at(10) }, { start: at(9), end: at(10) })).toBe(true)
    expect(overlaps({ start: at(9), end: at(11) }, { start: at(10), end: at(12) })).toBe(true)
    expect(overlaps({ start: at(9), end: at(10) }, { start: at(10), end: at(11) })).toBe(false)
  })
})

describe("computeFreeSlots", () => {
  const base = { fromDate: MONDAY, days: 1, timeZone: LIMA, now: BEFORE }

  it("parte la disponibilidad en sesiones de 60 minutos", () => {
    const slots = computeFreeSlots({ ...base, availability: mondayMorning })
    expect(slots.map((slot) => slot.time)).toEqual(["09:00", "10:00", "11:00"])
    expect(slots[0]).toEqual({ startsAt: "2026-11-16T14:00:00.000Z", date: MONDAY, time: "09:00" })
  })

  it("no ofrece una sesión que no cabe completa en el bloque", () => {
    const slots = computeFreeSlots({
      ...base,
      availability: [{ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "10:30" }],
    })
    expect(slots.map((slot) => slot.time)).toEqual(["09:00"])
  })

  it("solo ofrece los días en que el coach atiende", () => {
    const slots = computeFreeSlots({ ...base, days: 8, availability: mondayMorning })
    expect([...new Set(slots.map((slot) => slot.date))]).toEqual([MONDAY, "2026-11-23"])
  })

  it("quita las horas ya reservadas", () => {
    const slots = computeFreeSlots({
      ...base,
      availability: mondayMorning,
      busy: [{ start: new Date("2026-11-16T15:00:00Z"), end: new Date("2026-11-16T16:00:00Z") }],
    })
    expect(slots.map((slot) => slot.time)).toEqual(["09:00", "11:00"])
  })

  it("quita todas las horas que toca un bloqueo parcial", () => {
    const slots = computeFreeSlots({
      ...base,
      availability: mondayMorning,
      // 09:30 a 10:30 en Lima: cruza las sesiones de las 09:00 y las 10:00.
      busy: [{ start: new Date("2026-11-16T14:30:00Z"), end: new Date("2026-11-16T15:30:00Z") }],
    })
    expect(slots.map((slot) => slot.time)).toEqual(["11:00"])
  })

  it("quita las horas de las clases grupales que dicta el coach", () => {
    const slots = computeFreeSlots({
      ...base,
      availability: mondayMorning,
      classes: [
        { dayOfWeek: "MONDAY", startTime: "10:00", duration: 45 },
        { dayOfWeek: "TUESDAY", startTime: "09:00", duration: 60 },
      ],
    })
    expect(slots.map((slot) => slot.time)).toEqual(["09:00", "11:00"])
  })

  it("no ofrece horas que ya pasaron ni la que está empezando", () => {
    const slots = computeFreeSlots({
      ...base,
      availability: mondayMorning,
      now: new Date("2026-11-16T15:00:00Z"),
    })
    expect(slots.map((slot) => slot.time)).toEqual(["11:00"])
  })

  it("sin disponibilidad no hay horas", () => {
    expect(computeFreeSlots({ ...base, days: 14, availability: [] })).toEqual([])
  })
})
