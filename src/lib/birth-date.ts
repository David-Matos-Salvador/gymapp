export const BIRTH_DATE_ERROR = "Escribe una fecha de nacimiento válida"

// Fecha AAAA-MM-DD que existe, que no es futura ni de hace más de 120 años.
export function isValidBirthDate(value: string, today: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false

  const newest = today.toISOString().slice(0, 10)
  const oldest = `${today.getUTCFullYear() - 120}${newest.slice(4)}`
  return value >= oldest && value <= newest
}
