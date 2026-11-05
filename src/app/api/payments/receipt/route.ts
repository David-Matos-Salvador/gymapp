import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { fileUrl, newKey, saveFile } from "@/lib/storage"
import { formatCurrency } from "@/lib/utils"

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

const paymentMethodSchema = z.enum(["CASH", "TRANSFER", "CARD", "STRIPE", "YAPE", "OTHER"])

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

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const membershipId = formData.get("membershipId") as string | null
    const methodRaw = (formData.get("method") as string) || "CASH"
    const reference = (formData.get("reference") as string) || null
    const methodParsed = paymentMethodSchema.safeParse(methodRaw)
    if (!methodParsed.success) {
      return NextResponse.json(
        { error: "Método de pago inválido", details: { method: ["Inválido"] } },
        { status: 400 }
      )
    }
    const method = methodParsed.data

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
    if (!user.gymId || membership.plan.gymId !== user.gymId) {
      return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 })
    }
    if (membership.paymentConfirmed && membership.endDate > new Date()) {
      return NextResponse.json(
        { error: "Tu membresía ya está confirmada y vigente" },
        { status: 409 }
      )
    }
    if (membership.endDate <= new Date()) {
      return NextResponse.json(
        { error: "Tu membresía venció. Renuévala antes de subir un comprobante." },
        { status: 409 }
      )
    }

    const existingPending = await prisma.payment.findFirst({
      where: { membershipId: membership.id, status: "PENDING", type: "MEMBERSHIP" },
      select: { id: true },
    })
    if (existingPending) {
      return NextResponse.json(
        { error: "Ya hay un comprobante pendiente para esta membresía" },
        { status: 409 }
      )
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
      const key = newKey("receipts", ext)
      const contentType = file.type || "application/octet-stream"
      await saveFile(key, new Uint8Array(await file.arrayBuffer()), contentType)
      receiptUrl = fileUrl(key)
    } catch (err) {
      logger.error("Receipt file write failed", {
        requestId,
        context: { route: "POST /api/payments/receipt", userId: user.id },
        error: err,
      })
      return NextResponse.json({ error: "Error al guardar el comprobante" }, { status: 500 })
    }

    try {
      // Payment is the source of truth: uploading a receipt only creates a
      // PENDING payment. Membership stays untouched until an admin/trainer
      // reviews and confirms the payment.
      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          membershipId: membership.id,
          amount: membership.planPrice ?? membership.plan.price,
          currency:
            membership.planPrice != null ? membership.planCurrency : membership.plan.currency,
          status: "PENDING",
          method,
          type: "MEMBERSHIP",
          receiptUrl,
          reference,
        },
      })

      const trainer = user.assignedTrainerId
        ? await prisma.user.findUnique({
            where: { id: user.assignedTrainerId },
            select: { id: true, name: true, gymId: true },
          })
        : null

      if (trainer && trainer.gymId === user.gymId) {
        await prisma.notification.create({
          data: {
            userId: trainer.id,
            title: "Nuevo comprobante de pago",
            message: `${user.name || "Un usuario"} subió un comprobante de ${formatCurrency(Number(membership.plan.price), membership.plan.currency)}. Revísalo en Pagos.`,
            type: "PAYMENT",
            metadata: { paymentId: payment.id, clientId: user.id },
          },
        })
        emitRealtime("notifications")
      }

      emitRealtime("pending-count")

      return NextResponse.json({ payment }, { status: 201 })
    } catch (err) {
      logger.error("Payment receipt registration failed", {
        requestId,
        context: { route: "POST /api/payments/receipt", userId: user.id },
        error: err,
      })
      return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
    }
  } catch (error) {
    logger.error("Receipt upload failed", {
      requestId,
      context: { route: "POST /api/payments/receipt", userId: user.id },
      error,
    })
    return NextResponse.json({ error: "Error al procesar el comprobante" }, { status: 500 })
  }
}
