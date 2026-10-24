import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads")
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE = 5 * 1024 * 1024

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

function hasValidSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === "image/png")
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  if (type === "image/gif")
    return (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    )
  if (type === "image/webp")
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
  return false
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (!(await rateLimit(`upload:${user.id}`, 30, 60))) {
    return NextResponse.json({ error: "Demasiadas subidas. Esperá un momento." }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const type = (formData.get("type") as string) || "general"

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPEG, PNG, WebP o GIF" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo muy grande. Maximo 5MB" }, { status: 400 })
    }

    const folder = type === "profile" ? "profiles" : type === "equipment" ? "equipment" : "general"
    const folderPath = join(UPLOAD_DIR, folder)

    await mkdir(folderPath, { recursive: true })

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasValidSignature(file.type, bytes)) {
      return NextResponse.json({ error: "El archivo no es una imagen válida" }, { status: 400 })
    }

    const ext = EXTENSION_BY_TYPE[file.type] ?? "jpg"
    const filename = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext
    const filePath = join(folderPath, filename)
    await writeFile(filePath, Buffer.from(bytes))

    const url = "/uploads/" + folder + "/" + filename

    if (type === "profile") {
      await prisma.user.update({ where: { id: user.id }, data: { image: url } })
    }

    return NextResponse.json({ url })
  } catch (error) {
    logger.error("File upload failed", {
      requestId,
      context: { route: "POST /api/upload", userId: user.id },
      error,
    })
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
  }
}
