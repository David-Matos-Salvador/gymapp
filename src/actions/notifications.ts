"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function markAsRead(notificationId: string) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })
    if (!notification) {
      return { error: "Notificación no encontrada" }
    }

    if (notification.userId !== user.id) {
      return { error: "No autorizado para esta notificación" }
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    })

    revalidatePath("/notifications")
    return { success: true }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { error: "Error al marcar notificación como leída" }
  }
}

export async function markAllAsRead(userId: string) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!currentUser) {
      return { error: "Usuario no encontrado" }
    }

    if (currentUser.id !== userId) {
      return { error: "No autorizado para esta acción" }
    }

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })

    revalidatePath("/notifications")
    return { success: true }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return { error: "Error al marcar todas las notificaciones como leídas" }
  }
}
