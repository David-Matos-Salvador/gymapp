export const BOOKING_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmada",
  ATTENDED: "Asistió",
  CANCELLED: "Cancelada",
}

export function getBookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABELS[status] ?? status
}
