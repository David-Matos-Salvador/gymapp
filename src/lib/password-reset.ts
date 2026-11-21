import { createHash, randomBytes } from "node:crypto"
import { z } from "zod"

/**
 * Recuperar contraseña (#127): enlace de un solo uso que vence en una hora.
 *
 * El token viaja solo en el correo; en la base (`VerificationToken`) se guarda su hash, así
 * que quien lea la base no puede usar un enlace pendiente.
 */

export const RESET_TOKEN_MINUTES = 60
const IDENTIFIER_PREFIX = "password-reset:"

/** Las mismas reglas que al crear la cuenta. */
export const newPasswordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe contener una mayúscula")
  .regex(/[0-9]/, "Debe contener un número")

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function newResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashResetToken(token) }
}

export function resetIdentifier(userId: string): string {
  return `${IDENTIFIER_PREFIX}${userId}`
}

/** Id del usuario de un identificador de recuperación, o null si es de otra cosa. */
export function userIdFromIdentifier(identifier: string): string | null {
  return identifier.startsWith(IDENTIFIER_PREFIX)
    ? identifier.slice(IDENTIFIER_PREFIX.length) || null
    : null
}

export function buildResetUrl(origin: string, token: string): string {
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`
}
