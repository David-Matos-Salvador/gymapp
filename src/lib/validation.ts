import { z } from "zod"

const UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9/_.-]+$/
const HTTP_URL = /^https?:\/\/\S+$/

export function isValidImageUrl(value: string): boolean {
  return UPLOAD_PATH.test(value) || HTTP_URL.test(value)
}

export const imageUrlSchema = z
  .string()
  .refine(isValidImageUrl, "Usá una imagen subida o una URL http(s) válida")
