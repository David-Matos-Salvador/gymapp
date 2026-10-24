import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { isSafeKey, readStoredFile } from "@/lib/storage"

/** Carpetas con datos sensibles: solo para personas con sesión iniciada. */
const PRIVATE_FOLDERS = ["receipts/"]

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const requestId = getRequestId(request)
  const key = (await params).key.join("/")

  if (!isSafeKey(key)) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
  }

  const isPrivate = PRIVATE_FOLDERS.some((folder) => key.startsWith(folder))
  if (isPrivate) {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  try {
    const file = await readStoredFile(key)
    if (!file) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    return new Response(Buffer.from(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "X-Content-Type-Options": "nosniff",
        // Cada archivo tiene un nombre único que no cambia: se puede guardar en caché mucho tiempo.
        "Cache-Control": isPrivate
          ? "private, max-age=3600"
          : "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    logger.error("File read failed", {
      requestId,
      context: { route: "GET /api/files", key },
      error,
    })
    return NextResponse.json({ error: "Error al leer el archivo" }, { status: 500 })
  }
}
