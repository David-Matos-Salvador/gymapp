export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  STRIPE: "Stripe",
  YAPE: "Yape",
  OTHER: "Otro",
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP: "Membresía",
  CLASS_BOOKING: "Reserva de clase",
  OTHER: "Otro",
}

export function formatPaymentMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

export function formatPaymentType(type: string): string {
  return PAYMENT_TYPE_LABELS[type] ?? type
}
