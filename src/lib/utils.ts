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
