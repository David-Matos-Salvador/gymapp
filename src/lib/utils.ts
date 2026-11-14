import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string | Date, options?: { includeTime?: boolean }): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  return d.toLocaleDateString("es-MX", {
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
