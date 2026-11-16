import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"
import {
  initialBookingState,
  withBooking,
  withoutBooking,
} from "@/components/classes/booking-state"

const classes = [
  { id: "yoga", confirmedCount: 1 },
  { id: "spinning", confirmedCount: 5 },
]
const bookings = [
  { id: "reserva-spinning", status: "CONFIRMED", classItem: { id: "spinning" } },
  { id: "reserva-vieja", status: "CANCELLED", classItem: { id: "yoga" } },
]

describe("estado de reservas de clases (#130)", () => {
  it("empieza con las reservas confirmadas y los lugares que llegan del servidor", () => {
    const state = initialBookingState(classes, bookings)
    expect(state.bookingIdByClass).toEqual({ spinning: "reserva-spinning" })
    expect(state.countByClass).toEqual({ yoga: 1, spinning: 5 })
  })

  it("al reservar guarda la reserva nueva y suma un lugar ocupado", () => {
    const state = withBooking(initialBookingState(classes, bookings), "yoga", "reserva-nueva")
    expect(state.bookingIdByClass.yoga).toBe("reserva-nueva")
    expect(state.countByClass.yoga).toBe(2)
    expect(state.countByClass.spinning).toBe(5)
  })

  it("una reserva recién hecha se puede cancelar sin recargar y resta un lugar", () => {
    const booked = withBooking(initialBookingState(classes, bookings), "yoga", "reserva-nueva")
    const cancelled = withoutBooking(booked, "yoga")
    expect(cancelled.bookingIdByClass.yoga).toBeUndefined()
    expect(cancelled.countByClass.yoga).toBe(1)
  })

  it("no cuenta dos veces la misma reserva ni baja de cero", () => {
    const initial = initialBookingState(classes, bookings)
    expect(withBooking(initial, "spinning", "otra")).toBe(initial)
    expect(withoutBooking(initial, "yoga")).toBe(initial)
    const empty = initialBookingState(
      [{ id: "pilates", confirmedCount: 0 }],
      [{ id: "r", status: "CONFIRMED", classItem: { id: "pilates" } }]
    )
    expect(withoutBooking(empty, "pilates").countByClass.pilates).toBe(0)
  })

  it("la pantalla de clases cancela con la reserva del estado, no con la lista inicial", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/classes/classes-view.tsx"),
      "utf8"
    )
    expect(source).not.toContain("bookings.find(")
    expect(source).toContain("bookingState.bookingIdByClass[classId]")
    expect(source).toContain("bookingState.countByClass[cls.id]")
  })
})
