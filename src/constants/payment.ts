export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  STRIPE: "Stripe",
  YAPE: "Yape",
  OTHER: "Otro",
}

// Efectivo y tarjeta se cobran en recepción: no hay comprobante que subir y el pago queda
// pendiente hasta que el gimnasio confirme que recibió el dinero.
export const METHODS_PAID_AT_RECEPTION = ["CASH", "CARD"]

export function paymentNeedsReceipt(method: string): boolean {
  return !METHODS_PAID_AT_RECEPTION.includes(method)
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

// Aviso para quien confirma el pago (el coach del miembro) cuando entra un pago nuevo.
export function newPaymentNotification(
  memberName: string | null,
  amount: string,
  method: string
): { title: string; message: string } {
  const name = memberName || "Un usuario"
  if (paymentNeedsReceipt(method)) {
    return {
      title: "Nuevo comprobante de pago",
      message: `${name} subió un comprobante de ${amount}. Revísalo en Comprobantes.`,
    }
  }
  const how = method === "CARD" ? "con tarjeta" : "en efectivo"
  return {
    title: "Pago por confirmar",
    message: `${name} avisó que pagará ${amount} ${how} en recepción. Confírmalo en Comprobantes cuando se reciba el pago.`,
  }
}
