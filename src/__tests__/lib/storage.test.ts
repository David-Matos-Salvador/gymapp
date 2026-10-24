import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { mkdtemp, rm } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

// Sin S3_ENDPOINT el storage usa la carpeta local `uploads/` dentro del directorio actual.
let workdir: string
let originalCwd: string

beforeAll(async () => {
  delete process.env.S3_ENDPOINT
  originalCwd = process.cwd()
  workdir = await mkdtemp(join(tmpdir(), "gymapp-storage-"))
  process.chdir(workdir)
})

afterAll(async () => {
  process.chdir(originalCwd)
  await rm(workdir, { recursive: true, force: true })
})

describe("storage", () => {
  it("guarda y lee un archivo en modo local", async () => {
    const { fileUrl, newKey, readStoredFile, saveFile } = await import("@/lib/storage")
    const key = newKey("profiles", "png")
    await saveFile(key, new Uint8Array([1, 2, 3]), "image/png")

    const file = await readStoredFile(key)
    expect(file?.body).toEqual(new Uint8Array([1, 2, 3]))
    expect(file?.contentType).toBe("image/png")
    expect(fileUrl(key)).toBe(`/api/files/${key}`)
  })

  it("genera nombres únicos dentro de la carpeta pedida", async () => {
    const { newKey } = await import("@/lib/storage")
    const a = newKey("receipts", "jpg")
    const b = newKey("receipts", "jpg")
    expect(a).toMatch(/^receipts\/\d+-[a-z0-9]+\.jpg$/)
    expect(a).not.toBe(b)
  })

  it("rechaza claves que intentan salir de la carpeta", async () => {
    const { isSafeKey, readStoredFile, saveFile } = await import("@/lib/storage")
    expect(isSafeKey("../etc/passwd")).toBe(false)
    expect(isSafeKey("/absoluta.png")).toBe(false)
    expect(isSafeKey("profiles/ok-1.png")).toBe(true)
    await expect(saveFile("../fuera.png", new Uint8Array([1]), "image/png")).rejects.toThrow()
    expect(await readStoredFile("../fuera.png")).toBeNull()
  })

  it("devuelve null si el archivo no existe", async () => {
    const { readStoredFile } = await import("@/lib/storage")
    expect(await readStoredFile("profiles/no-existe.png")).toBeNull()
  })
})
