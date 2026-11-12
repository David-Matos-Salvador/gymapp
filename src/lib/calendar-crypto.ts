import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/**
 * Cifrado en reposo de las credenciales de calendarios externos (AES-256-GCM).
 *
 * La llave vive solo en la variable de entorno CALENDAR_TOKEN_ENCRYPTION_KEY
 * (32 bytes en base64). Formato guardado: "v1.<iv>.<etiqueta>.<cifrado>", todo
 * en base64url. La etiqueta de GCM hace que un valor alterado no se pueda descifrar.
 */

const VERSION = "v1"
const KEY_BYTES = 32
const IV_BYTES = 12

export function parseEncryptionKey(value: string | undefined): Buffer | null {
  if (!value?.trim()) return null
  const key = Buffer.from(value.trim(), "base64")
  return key.length === KEY_BYTES ? key : null
}

function requireKey(key?: Buffer): Buffer {
  const resolved = key ?? parseEncryptionKey(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY)
  if (!resolved) throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY no está configurada")
  return resolved
}

export function encryptSecret(plainText: string, key?: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", requireKey(key), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])
  return [VERSION, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".")
}

export function decryptSecret(stored: string, key?: Buffer): string {
  const [version, iv, tag, encrypted] = stored.split(".")
  if (version !== VERSION || !iv || !tag || encrypted === undefined) {
    throw new Error("Credencial cifrada con formato desconocido")
  }
  const decipher = createDecipheriv("aes-256-gcm", requireKey(key), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
