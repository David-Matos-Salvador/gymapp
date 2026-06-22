import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "receipts")
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
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
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa JPEG, PNG, WebP o GIF" }, { status: 400 })
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

    await mkdir(UPLOAD_DIR, { recursive: true })

    const ext = file.name.split(".").pop() || "jpg"
    const filename = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext
    const filePath = join(UPLOAD_DIR, filename)

    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    const receiptUrl = "/uploads/receipts/" + filename
    const now = new Date()
    const endDate = new Date(now.getTime() + plan.durationDays * 86400000)

    const [membership, payment] = await prisma.$transaction([
      prisma.membership.create({
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
      }),
      prisma.payment.create({
        data: {
          userId: user.id,
          amount: plan.price,
          currency: plan.currency,
          status: "PENDING",
          method: method as "CASH" | "TRANSFER" | "CARD" | "STRIPE" | "YAPE" | "OTHER",
          type: "MEMBERSHIP",
          receiptUrl,
          reference: null,
        },
      }),
    ])

    return NextResponse.json({ membership, payment }, { status: 201 })
  } catch (error) {
    console.error("Payment upload error:", error)
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 })
  }
}
