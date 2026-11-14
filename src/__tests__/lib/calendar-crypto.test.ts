import { randomBytes } from "node:crypto"
import { describe, expect, it } from "vitest"
import { decryptSecret, encryptSecret, parseEncryptionKey } from "@/lib/calendar-crypto"

const key = randomBytes(32)
const otherKey = randomBytes(32)

describe("parseEncryptionKey", () => {
  it("acepta solo 32 bytes en base64", () => {
    expect(parseEncryptionKey(key.toString("base64"))).toEqual(key)
    expect(parseEncryptionKey(randomBytes(16).toString("base64"))).toBeNull()
    expect(parseEncryptionKey("")).toBeNull()
    expect(parseEncryptionKey(undefined)).toBeNull()
  })
})

describe("encryptSecret / decryptSecret", () => {
  it("descifra lo que cifró", () => {
    const stored = encryptSecret("refresh-token-de-prueba", key)
    expect(decryptSecret(stored, key)).toBe("refresh-token-de-prueba")
  })

  it("no guarda el valor en texto plano y usa un formato versionado", () => {
    const stored = encryptSecret("refresh-token-de-prueba", key)
    expect(stored).not.toContain("refresh-token-de-prueba")
    expect(stored.split(".")).toHaveLength(4)
    expect(stored.startsWith("v1.")).toBe(true)
  })

  it("cifra distinto cada vez (IV aleatorio)", () => {
    expect(encryptSecret("igual", key)).not.toBe(encryptSecret("igual", key))
  })

  it("falla con otra llave", () => {
    const stored = encryptSecret("secreto", key)
    expect(() => decryptSecret(stored, otherKey)).toThrow()
  })

  it("falla si alguien altera el valor guardado", () => {
    const [version, iv, tag, data] = encryptSecret("secreto", key).split(".")
    const flipped = Buffer.from(data, "base64url")
    flipped[0] ^= 1
    expect(() =>
      decryptSecret([version, iv, tag, flipped.toString("base64url")].join("."), key)
    ).toThrow()
  })

  it("rechaza formatos desconocidos y la falta de llave", () => {
    expect(() => decryptSecret("texto-plano", key)).toThrow("formato desconocido")
    expect(() => decryptSecret("v2.a.b.c", key)).toThrow("formato desconocido")
    const previous = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY
    try {
      expect(() => encryptSecret("secreto")).toThrow("CALENDAR_TOKEN_ENCRYPTION_KEY")
    } finally {
      if (previous !== undefined) process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = previous
    }
  })
})
