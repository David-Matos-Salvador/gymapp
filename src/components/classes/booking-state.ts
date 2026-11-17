export interface ClassBookingState {
  /** Reserva confirmada del usuario en cada clase (id de clase → id de reserva). */
  bookingIdByClass: Record<string, string>
  /** Lugares ocupados de cada clase (id de clase → reservas confirmadas). */
  countByClass: Record<string, number>
}

export function initialBookingState(
  classes: { id: string; confirmedCount: number }[],
  bookings: { id: string; status: string; classItem: { id: string } }[]
): ClassBookingState {
  return {
    bookingIdByClass: Object.fromEntries(
      bookings.filter((b) => b.status === "CONFIRMED").map((b) => [b.classItem.id, b.id])
    ),
    countByClass: Object.fromEntries(classes.map((c) => [c.id, c.confirmedCount])),
  }
}

export function withBooking(
  state: ClassBookingState,
  classId: string,
  bookingId: string
): ClassBookingState {
  if (state.bookingIdByClass[classId]) return state
  return {
    bookingIdByClass: { ...state.bookingIdByClass, [classId]: bookingId },
    countByClass: { ...state.countByClass, [classId]: (state.countByClass[classId] ?? 0) + 1 },
  }
}

export function withoutBooking(state: ClassBookingState, classId: string): ClassBookingState {
  if (!state.bookingIdByClass[classId]) return state
  const bookingIdByClass = { ...state.bookingIdByClass }
  delete bookingIdByClass[classId]
  return {
    bookingIdByClass,
    countByClass: {
      ...state.countByClass,
      [classId]: Math.max(0, (state.countByClass[classId] ?? 0) - 1),
    },
  }
}

/** Pregunta antes de cancelar la reserva de una clase: "¿Cancelar tu reserva en Yoga (lunes 07:00)?". */
export function cancelClassBookingQuestion(name: string, day: string, startTime: string): string {
  return `¿Cancelar tu reserva en ${name} (${day} ${startTime})? Tu lugar quedará libre para otra persona.`
}
