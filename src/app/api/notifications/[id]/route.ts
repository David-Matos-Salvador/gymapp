import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 })
  }
  if (notification.userId !== user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  })

  return NextResponse.json({ notification: updated })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 })
  }
  if (notification.userId !== user.id) {
    if (user.role !== "SUPER_ADMIN") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
      const target = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { gymId: true },
      })
      if (!target || !user.gymId || target.gymId !== user.gymId) {
        return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 })
      }
    }
  }

  await prisma.notification.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
