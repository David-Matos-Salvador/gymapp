import { z } from "zod"

// Archivos subidos: los nuevos se sirven por /api/files/; /uploads/ queda por compatibilidad.
const UPLOAD_PATH = /^\/(api\/files|uploads)\/[A-Za-z0-9/_.-]+$/
const HTTP_URL = /^https?:\/\/\S+$/

export function isValidImageUrl(value: string): boolean {
  return UPLOAD_PATH.test(value) || HTTP_URL.test(value)
}

export const imageUrlSchema = z
  .string()
  .refine(isValidImageUrl, "Usa una imagen subida o una URL http(s) válida")
