import { z } from "zod"

export const PLAN_CURRENCY = "PEN"
export const MAX_PLAN_PRICE = 1_000_000
export const MIN_PLAN_DURATION_DAYS = 1
export const MAX_PLAN_DURATION_DAYS = 3650

export const planPriceSchema = z
  .number()
  .min(0, "El precio no puede ser negativo")
  .max(MAX_PLAN_PRICE, "Precio fuera de rango")
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, "Máximo dos decimales")

export const planDurationSchema = z
  .number()
  .int("La duración debe ser entera")
  .min(MIN_PLAN_DURATION_DAYS, "Duración mínima: 1 día")
  .max(MAX_PLAN_DURATION_DAYS, "Duración máxima: 3650 días")

export const planCurrencySchema = z.literal(PLAN_CURRENCY, {
  message: "Solo se admite PEN",
})

export function isFreePlan(price: unknown): boolean {
  return Number(price) === 0
}
