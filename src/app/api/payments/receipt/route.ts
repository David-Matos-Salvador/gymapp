import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "receipts")
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpg",
]
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const membershipId = formData.get("membershipId") as string | null
    const method = (formData.get("method") as string) || "CASH"
    const reference = (formData.get("reference") as string) || null

    if (!file) {
      return NextResponse.json({ error: "Comprobante requerido" }, { status: 400 })
    }
    if (!membershipId) {
      return NextResponse.json({ error: "Membresía requerida" }, { status: 400 })
    }

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { plan: true },
    })
    if (!membership) {
      return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 })
    }
    if (membership.userId !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const mimeValid = file.type === "" || ALLOWED_TYPES.includes(file.type)
    const extValid = ALLOWED_EXTENSIONS.includes(ext)
    if (!mimeValid && !extValid) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPEG, PNG, WebP o GIF" },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo muy grande. Máximo 5MB" }, { status: 400 })
    }

    let receiptUrl: string
    try {
      await mkdir(UPLOAD_DIR, { recursive: true })
      const filename = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext
      const filePath = join(UPLOAD_DIR, filename)
      const bytes = await file.arrayBuffer()
      await writeFile(filePath, Buffer.from(bytes))
      receiptUrl = "/uploads/receipts/" + filename
    } catch (err) {
      console.error("File write error:", err)
      return NextResponse.json({ error: "Error al guardar el comprobante" }, { status: 500 })
    }

    try {
      const [payment] = await prisma.$transaction([
        prisma.payment.create({
          data: {
            userId: user.id,
            amount: membership.plan.price,
            currency: membership.plan.currency,
            status: "PENDING",
            method: method as "CASH" | "TRANSFER" | "CARD" | "STRIPE" | "YAPE" | "OTHER",
            type: "MEMBERSHIP",
            receiptUrl,
            reference,
          },
        }),
        prisma.membership.update({
          where: { id: membershipId },
          data: {
            paymentConfirmed: true,
            paymentMethod: method as "CASH" | "TRANSFER" | "CARD" | "STRIPE" | "YAPE" | "OTHER",
            paymentRef: reference,
          },
        }),
      ])

      const acceptedRequest = await prisma.trainerRequest.findFirst({
        where: { clientId: user.id, status: "ACCEPTED" },
        include: { trainer: { select: { id: true, name: true } } },
      })

      if (acceptedRequest) {
        await prisma.notification.create({
          data: {
            userId: acceptedRequest.trainerId,
            title: "Nuevo comprobante de pago",
            message: `${user.name || "Un usuario"} subió un comprobante de ${membership.plan.currency.toUpperCase()} $${membership.plan.price}. Revísalo en Pagos.`,
            type: "PAYMENT",
            metadata: { paymentId: payment.id, clientId: user.id },
          },
        })
        emitRealtime("notifications")
      }

      emitRealtime("pending-count")

      return NextResponse.json({ payment }, { status: 201 })
    } catch (err) {
      console.error("Payment receipt error:", err)
      return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
    }
  } catch (error) {
    console.error("Receipt upload error:", error)
    return NextResponse.json({ error: "Error al procesar el comprobante" }, { status: 500 })
  }
}
