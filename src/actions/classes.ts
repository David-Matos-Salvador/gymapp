"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function bookClass(classId: string) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const classItem = await prisma.class.findUnique({ where: { id: classId } })
    if (!classItem) {
      return { error: "Clase no encontrada" }
    }

    const existingBooking = await prisma.booking.findFirst({
      where: { userId: user.id, classId, status: "CONFIRMED" },
    })
    if (existingBooking) {
      return { error: "Ya tienes una reserva en esta clase" }
    }

    const confirmedCount = await prisma.booking.count({
      where: { classId, status: "CONFIRMED" },
    })
    if (confirmedCount >= classItem.capacity) {
      return { error: "Clase llena" }
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        classId,
        status: "CONFIRMED",
      },
      include: {
        classItem: {
          include: { trainer: { select: { name: true } } },
        },
      },
    })

    revalidatePath("/classes")
    return { success: true, booking }
  } catch (error) {
    console.error("Error booking class:", error)
    return { error: "Error al reservar la clase" }
  }
}

export async function cancelBooking(bookingId: string) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.id },
    })
    if (!booking) {
      return { error: "Reserva no encontrada" }
    }

    if (booking.status === "CANCELLED") {
      return { error: "La reserva ya está cancelada" }
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    })

    revalidatePath("/classes")
    return { success: true }
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return { error: "Error al cancelar la reserva" }
  }
}
