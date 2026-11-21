import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"
import { fileUrl, newKey, saveFile } from "@/lib/storage"
import { formatCurrency } from "@/lib/utils"
import { newPaymentNotification, paymentNeedsReceipt } from "@/constants/payment"

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
    const planId = formData.get("planId") as string | null
    const method = (formData.get("method") as string) || "YAPE"

    if (!["CASH", "TRANSFER", "CARD", "STRIPE", "YAPE", "OTHER"].includes(method)) {
      return NextResponse.json({ error: "Método de pago no válido" }, { status: 400 })
    }
    // Efectivo y tarjeta se pagan en recepción: no llevan comprobante.
    const receiptFile = paymentNeedsReceipt(method) ? file : null
    if (paymentNeedsReceipt(method) && !receiptFile) {
      return NextResponse.json({ error: "Comprobante requerido" }, { status: 400 })
    }
    if (!planId) {
      return NextResponse.json({ error: "Plan requerido" }, { status: 400 })
    }
    const ext = receiptFile?.name.split(".").pop()?.toLowerCase() || "jpg"
    if (receiptFile) {
      const mimeValid = receiptFile.type === "" || ALLOWED_TYPES.includes(receiptFile.type)
      const extValid = ALLOWED_EXTENSIONS.includes(ext)
      if (!mimeValid && !extValid) {
        return NextResponse.json(
          { error: "Formato no permitido. Usa JPEG, PNG, WebP o GIF" },
          { status: 400 }
        )
      }
      if (receiptFile.size > MAX_SIZE) {
        return NextResponse.json({ error: "Archivo muy grande. Máximo 5 MB" }, { status: 400 })
      }
    }

    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
    if (plan && Number(plan.price) === 0) {
      return NextResponse.json(
        { error: "Este plan es gratuito: actívalo desde Membresía sin comprobante" },
        { status: 400 }
      )
    }
    if (!plan || !plan.active || plan.gymId !== user.gymId) {
      return NextResponse.json({ error: "Plan no encontrado o inactivo" }, { status: 404 })
    }

    let receiptUrl: string | null = null
    if (receiptFile) {
      try {
        const key = newKey("receipts", ext)
        const contentType = receiptFile.type || "application/octet-stream"
        await saveFile(key, new Uint8Array(await receiptFile.arrayBuffer()), contentType)
        receiptUrl = fileUrl(key)
      } catch (err) {
        logger.error("Receipt file write failed", {
          requestId,
          context: { route: "POST /api/payments", userId: user.id },
          error: err,
        })
        return NextResponse.json({ error: "Error al guardar el comprobante" }, { status: 500 })
      }
    }

    const now = new Date()
    const endDate = new Date(now.getTime() + plan.durationDays * 86400000)

    try {
      const existingMembership = await prisma.membership.findFirst({
        where: { userId: user.id, planId: plan.id },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      })

      const otherActive = await prisma.membership.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          endDate: { gt: now },
          paymentConfirmed: true,
          planId: { not: plan.id },
        },
        select: { id: true },
      })
      if (otherActive) {
        return NextResponse.json(
          { error: "Ya tienes una membresía vigente. Renuévala en lugar de comprar otra." },
          { status: 409 }
        )
      }

      if (existingMembership?.status === "ACTIVE" && existingMembership.endDate <= now) {
        return NextResponse.json(
          { error: "Tu membresía venció. Renuévala antes de registrar un nuevo pago." },
          { status: 409 }
        )
      }
      if (existingMembership?.status && existingMembership.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Ese plan ya tiene una membresía cerrada. Renuévala desde Membresía." },
          { status: 409 }
        )
      }
      if (existingMembership?.paymentConfirmed) {
        return NextResponse.json(
          { error: "Ya tienes una membresía activa con este plan." },
          { status: 409 }
        )
      }

      if (existingMembership) {
        const pending = await prisma.payment.findFirst({
          where: {
            membershipId: existingMembership.id,
            status: "PENDING",
            type: "MEMBERSHIP",
          },
          select: { id: true },
        })
        if (pending) {
          return NextResponse.json(
            { error: "Ya hay un pago pendiente de confirmar para esta membresía" },
            { status: 409 }
          )
        }
      }

      const { membership, payment } = await prisma.$transaction(async (tx) => {
        const targetMembership =
          existingMembership ??
          (await tx.membership.create({
            data: {
              userId: user.id,
              planId: plan.id,
              status: "ACTIVE",
              startDate: now,
              endDate,
              paymentConfirmed: false,
              paymentMethod: method as "CASH" | "TRANSFER" | "CARD" | "STRIPE" | "YAPE" | "OTHER",
              paymentRef: null,
            },
            include: { plan: true },
          }))

        const amount = existingMembership?.planPrice ?? plan.price
        const currency =
          existingMembership?.planPrice != null ? existingMembership.planCurrency : plan.currency

        const createdPayment = await tx.payment.create({
          data: {
            userId: user.id,
            membershipId: targetMembership.id,
            amount,
            currency,
            status: "PENDING",
            method: method as "CASH" | "TRANSFER" | "CARD" | "STRIPE" | "YAPE" | "OTHER",
            type: "MEMBERSHIP",
            receiptUrl,
            reference: null,
          },
        })

        return { membership: targetMembership, payment: createdPayment }
      })

      if (user.assignedTrainerId) {
        const trainer = await prisma.user.findUnique({
          where: { id: user.assignedTrainerId },
          select: { id: true, gymId: true },
        })
        if (trainer && trainer.gymId === user.gymId) {
          await prisma.notification.create({
            data: {
              userId: trainer.id,
              ...newPaymentNotification(
                user.name,
                formatCurrency(Number(plan.price), plan.currency),
                method
              ),
              type: "PAYMENT",
              metadata: { paymentId: payment.id, clientId: user.id },
            },
          })
          emitRealtime("notifications", user.gymId)
        }
      }

      emitRealtime("pending-count", user.gymId)

      return NextResponse.json({ membership, payment }, { status: 201 })
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Ya existe una membresía para ese plan. Renuévala desde Membresía." },
          { status: 409 }
        )
      }
      logger.error("Payment database operation failed", {
        requestId,
        context: { route: "POST /api/payments", userId: user.id },
        error: err,
      })
      return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
    }
  } catch (error) {
    logger.error("Payment upload failed", {
      requestId,
      context: { route: "POST /api/payments", userId: user.id },
      error,
    })
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 })
  }
}
