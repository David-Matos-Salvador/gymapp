/**
 * Botón «Escríbenos por WhatsApp» de la portada, para gimnasios interesados. El número sale de
 * `CONTACT_WHATSAPP` (en el servidor, en tiempo de ejecución; no está en el repo). Es de Perú:
 * puede venir con o sin +51 y con espacios o guiones.
 */

const PERU_CODE = "51"
const WHATSAPP_MESSAGE = "Hola, quiero GymApp para mi gimnasio."

/** Solo dígitos, con 51 adelante, o null si no parece un número de Perú. */
export function normalizePeruWhatsapp(raw: string | undefined | null): string | null {
  let digits = (raw ?? "").replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  // Celulares de 9 dígitos y fijos de 8 (código de ciudad + número), sin el 51.
  if (/^\d{8,9}$/.test(digits)) digits = PERU_CODE + digits
  return /^51\d{8,9}$/.test(digits) ? digits : null
}

/** Enlace a WhatsApp con un mensaje inicial, o null si no hay número configurado. */
export function contactWhatsappUrl(raw: string | undefined | null): string | null {
  const number = normalizePeruWhatsapp(raw)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}` : null
}
