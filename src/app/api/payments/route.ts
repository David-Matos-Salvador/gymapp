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
    const planId = formData.get("planId") as string | null
    const method = (formData.get("method") as string) || "YAPE"

    if (!file) {
      return NextResponse.json({ error: "Comprobante requerido" }, { status: 400 })
    }
    if (!planId) {
      return NextResponse.json({ error: "Plan requerido" }, { status: 400 })
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

    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.active) {
      return NextResponse.json({ error: "Plan no encontrado o inactivo" }, { status: 404 })
    }

    if (!["CASH", "TRANSFER", "CARD", "STRIPE", "YAPE", "OTHER"].includes(method)) {
      return NextResponse.json({ error: "Método de pago no válido" }, { status: 400 })
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

    const now = new Date()
    const endDate = new Date(now.getTime() + plan.durationDays * 86400000)

    try {
      const existingMembership = await prisma.membership.findFirst({
        where: {
          userId: user.id,
          planId: plan.id,
          status: "ACTIVE",
          paymentConfirmed: false,
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      })

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
            { error: "Ya hay un comprobante pendiente para esta membresía" },
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

        const createdPayment = await tx.payment.create({
          data: {
            userId: user.id,
            membershipId: targetMembership.id,
            amount: plan.price,
            currency: plan.currency,
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
              title: "Nuevo comprobante de pago",
              message: `${user.name || "Un usuario"} subió un comprobante de ${plan.currency.toUpperCase()} $${plan.price}. Revísalo en Pagos.`,
              type: "PAYMENT",
              metadata: { paymentId: payment.id, clientId: user.id },
            },
          })
          emitRealtime("notifications")
        }
      }

      emitRealtime("pending-count")

      return NextResponse.json({ membership, payment }, { status: 201 })
    } catch (err) {
      console.error("Payment DB error:", err)
      return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
    }
  } catch (error) {
    console.error("Payment upload error:", error)
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 })
  }
}
