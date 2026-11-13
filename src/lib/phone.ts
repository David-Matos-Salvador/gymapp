export const PHONE_ERROR = "Escribe un teléfono válido, por ejemplo +51 999 123 456"

// Teléfono escrito a mano: dígitos con +, espacios, guiones o paréntesis; de 6 a 15 dígitos.
export function isValidPhone(value: string): boolean {
  const phone = value.trim()
  if (!/^\+?[\d\s()-]+$/.test(phone)) return false
  const digits = phone.replace(/\D/g, "").length
  return digits >= 6 && digits <= 15
}
