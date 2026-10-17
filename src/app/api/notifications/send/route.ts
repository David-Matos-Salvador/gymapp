import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"
import { sendPush } from "@/lib/push-notifications"
import { sendMembershipReminder } from "@/lib/email"

const sendNotificationSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  message: z.string().min(1, "El mensaje es requerido"),
  type: z
    .enum([
      "INFO",
      "WARNING",
      "REMINDER",
      "PAYMENT",
      "MEMBERSHIP",
      "CLASS",
      "CHECK_IN",
      "GOAL",
      "SYSTEM",
    ])
    .default("INFO"),
  userId: z.string().min(1, "El userId es requerido"),
  sendEmail: z.boolean().optional().default(false),
  daysLeft: z.number().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!currentUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (
    currentUser.role !== "ADMIN" &&
    currentUser.role !== "TRAINER" &&
    currentUser.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = sendNotificationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { title, message, type, userId, sendEmail, daysLeft } = parsed.data

  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const notification = await prisma.notification.create({
    data: { title, message, type, userId },
  })

  emitRealtime("notifications")

  const emailResult: { triggered: boolean; success?: boolean; error?: string } = {
    triggered: false,
  }
  const pushResult: { triggered: boolean; success?: boolean; sent?: number; error?: string } = {
    triggered: false,
  }

  if (sendEmail && targetUser.email) {
    emailResult.triggered = true
    if (type === "MEMBERSHIP") {
      const result = await sendMembershipReminder(
        targetUser.email,
        targetUser.name ?? "Usuario",
        daysLeft ?? 0
      )
      emailResult.success = result.success
      emailResult.error = result.error
    } else {
      // TODO: Extend with type-specific email templates
      // - PAYMENT → payment confirmation/receipt
      // - CLASS → class booking confirmation
      // - REMINDER → general reminder email
      // - CHECK_IN → check-in confirmation
      console.log(
        `[Notifications] Email trigger requested for type=${type} (no specific handler yet)`
      )
      emailResult.error = `No email handler implemented for type: ${type}`
    }
  }

  const pushResultData = await sendPush(userId, { title, body: message })
  pushResult.triggered = true
  pushResult.success = pushResultData.success
  pushResult.sent = pushResultData.sent
  pushResult.error = pushResultData.error

  return NextResponse.json(
    {
      notification,
      email: emailResult,
      push: pushResult,
    },
    { status: 201 }
  )
}
