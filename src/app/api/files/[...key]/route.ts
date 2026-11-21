import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { prisma } from "@/lib/prisma"
import { canAccessGym, isSuperAdmin } from "@/lib/authz"
import { fileUrl, isSafeKey, readStoredFile } from "@/lib/storage"

/** Carpetas con datos sensibles: solo las ve quien tiene permiso sobre el pago. */
const PRIVATE_FOLDERS = ["receipts/"]

/**
 * Un comprobante lo ven el miembro que lo subió, su coach, el admin de su gimnasio
 * y el súper admin. A cualquier otra persona se le responde como si no existiera.
 */
async function canSeeReceipt(
  viewer: { id: string; role: string; gymId: string | null },
  receiptUrl: string
): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: { receiptUrl },
    select: { userId: true, user: { select: { gymId: true, assignedTrainerId: true } } },
  })
  if (!payment) return false
  if (payment.userId === viewer.id || isSuperAdmin(viewer.role)) return true
  if (!canAccessGym(viewer, payment.user.gymId)) return false
  if (viewer.role === "ADMIN") return true
  return viewer.role === "TRAINER" && payment.user.assignedTrainerId === viewer.id
}

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
    const viewer = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, gymId: true },
    })
    if (!viewer || !(await canSeeReceipt(viewer, fileUrl(key)))) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
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
