import { z } from "zod"
import { MEASUREMENT_RANGES, type MeasurementKey } from "@/constants/measurements"

// Archivos subidos: los nuevos se sirven por /api/files/; /uploads/ queda por compatibilidad.
const UPLOAD_PATH = /^\/(api\/files|uploads)\/[A-Za-z0-9/_.-]+$/
const HTTP_URL = /^https?:\/\/\S+$/

export function isValidImageUrl(value: string): boolean {
  return UPLOAD_PATH.test(value) || HTTP_URL.test(value)
}

export const imageUrlSchema = z
  .string()
  .refine(isValidImageUrl, "Usa una imagen subida o una URL http(s) válida")

const measurementShape = Object.fromEntries(
  (Object.keys(MEASUREMENT_RANGES) as MeasurementKey[]).map((key) => [
    key,
    z.number().min(MEASUREMENT_RANGES[key].min).max(MEASUREMENT_RANGES[key].max).optional(),
  ])
) as Record<MeasurementKey, z.ZodOptional<z.ZodNumber>>

// Medición corporal: cada valor es opcional, pero debe estar dentro de su rango aceptado.
export const bodyMeasurementSchema = z.object({
  ...measurementShape,
  bmi: z.number().optional(),
  notes: z.string().optional(),
})
