/**
 * Almacenamiento de archivos subidos (fotos de perfil, equipamiento, comprobantes de pago).
 *
 * - Con S3_ENDPOINT configurado (QA y producción): los archivos van a SeaweedFS, un almacén
 *   compatible con S3 que vive en la red interna del servidor.
 * - Sin S3_ENDPOINT (desarrollo local y tests): los archivos van a la carpeta `uploads/`.
 *
 * En los dos casos la app los sirve por `GET /api/files/<key>`, así SeaweedFS nunca queda
 * expuesto a internet y las URLs guardadas en la base son las mismas en todos los ambientes.
 */
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname, join, normalize, sep } from "path"

export const FILES_ROUTE = "/api/files/"

/** Carpeta local para desarrollo. Fuera de `public/` para que siempre pase por /api/files. */
const LOCAL_DIR = join(process.cwd(), "uploads")

/** Solo letras, números, guiones, puntos y barras; sin `..` ni barra inicial. */
const SAFE_KEY = /^(?!\/)(?!.*\.\.)[A-Za-z0-9/_.-]+$/

export function isSafeKey(key: string): boolean {
  return SAFE_KEY.test(key)
}

/** URL pública (dentro de la app) de un archivo guardado. */
export function fileUrl(key: string): string {
  return FILES_ROUTE + key
}

/** Nombre único para un archivo nuevo: `carpeta/1700000000000-ab12cd.ext`. */
export function newKey(folder: string, extension: string): string {
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
}

let client: S3Client | null = null

function s3(): { client: S3Client; bucket: string } | null {
  const endpoint = process.env.S3_ENDPOINT
  if (!endpoint) return null
  client ??= new S3Client({
    endpoint,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  })
  return { client, bucket: process.env.S3_BUCKET ?? "" }
}

function localPath(key: string): string {
  const full = normalize(join(LOCAL_DIR, key))
  if (!full.startsWith(LOCAL_DIR + sep)) throw new Error("Invalid file key")
  return full
}

export async function saveFile(key: string, body: Uint8Array, contentType: string): Promise<void> {
  if (!isSafeKey(key)) throw new Error("Invalid file key")
  const remote = s3()
  if (remote) {
    await remote.client.send(
      new PutObjectCommand({
        Bucket: remote.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
    return
  }
  const path = localPath(key)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, body)
}

export type StoredFile = { body: Uint8Array; contentType: string }

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
}

/** Lee un archivo. Devuelve null si no existe. */
export async function readStoredFile(key: string): Promise<StoredFile | null> {
  if (!isSafeKey(key)) return null
  const remote = s3()
  if (remote) {
    try {
      const result = await remote.client.send(
        new GetObjectCommand({ Bucket: remote.bucket, Key: key })
      )
      if (!result.Body) return null
      return {
        body: await result.Body.transformToByteArray(),
        contentType: result.ContentType || "application/octet-stream",
      }
    } catch (error) {
      if (error instanceof NoSuchKey) return null
      throw error
    }
  }
  try {
    const body = new Uint8Array(await readFile(localPath(key)))
    const extension = key.split(".").pop()?.toLowerCase() ?? ""
    return { body, contentType: CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream" }
  } catch {
    return null
  }
}
