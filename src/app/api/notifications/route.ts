import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"
import { canAccessGym } from "@/lib/authz"

const createNotificationSchema = z.object({
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
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unread") === "true"

  const where: Record<string, unknown> = { userId: user.id }
  if (unreadOnly) {
    where.read = false
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ notifications })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createNotificationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { title, message, type, userId } = parsed.data

  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  // Admin y coach solo notifican dentro de su gimnasio (los dos deben tener uno).
  if (!canAccessGym(user, targetUser.gymId)) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }
  if (user.role === "TRAINER") {
    const clientIds = await getTrainerClientIds(user.id, user.gymId)
    if (!clientIds.includes(targetUser.id)) {
      return NextResponse.json({ error: "Solo puedes notificar a tus clientes" }, { status: 403 })
    }
  }

  const notification = await prisma.notification.create({
    data: { title, message, type, userId },
  })

  return NextResponse.json({ notification }, { status: 201 })
}
