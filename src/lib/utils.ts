import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string | Date, options?: { includeTime?: boolean }): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  return d.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(options?.includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "día" : "días"}`
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

// Una serie sin peso (dominadas, burpees) se muestra solo con sus repeticiones, no como «10×0kg».
export function formatSet(reps: number, weight: number): string {
  return weight > 0 ? `${reps}×${weight}kg` : pluralize(reps, "rep", "reps")
}

// Las series de una sesión agrupadas por ejercicio, en el orden en que se hizo cada uno, para no
// mostrarlas intercaladas («Fondos, Press, Fondos…»).
export function groupSetsByExercise<T extends { exerciseName: string }>(
  sets: T[]
): { exerciseName: string; sets: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const set of sets) {
    const group = groups.get(set.exerciseName)
    if (group) group.push(set)
    else groups.set(set.exerciseName, [set])
  }
  return Array.from(groups, ([exerciseName, grouped]) => ({ exerciseName, sets: grouped }))
}

// Resumen de una sesión: el volumen (reps × kg) o, si fue solo con peso corporal, el total de
// repeticiones en vez de «0 kg volumen». null si no hay nada que mostrar.
export function formatSessionVolume(sets: { reps: number; weight: number }[]): string | null {
  const volume = sets.reduce((sum, set) => sum + set.reps * set.weight, 0)
  if (volume > 0) return `${Math.round(volume)} kg volumen`
  const reps = sets.reduce((sum, set) => sum + set.reps, 0)
  return reps > 0 ? `${pluralize(reps, "rep", "reps")} en total` : null
}

export function formatCurrency(amount: number, currency = "PEN"): string {
  const fmt = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const formatted = fmt.format(amount)
  if (currency.toUpperCase() === "PEN" && !formatted.startsWith("S/")) {
    return `S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return formatted
}
