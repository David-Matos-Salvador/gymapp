"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function confirmPayment(membershipId: string, paymentRef: string) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { error: "No autorizado" }
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return { error: "Usuario no encontrado" }
    }

    if (user.role !== "ADMIN" && user.role !== "TRAINER") {
      return { error: "Sin permisos" }
    }

    const membership = await prisma.membership.findUnique({ where: { id: membershipId } })
    if (!membership) {
      return { error: "Membresía no encontrada" }
    }

    if (membership.paymentConfirmed) {
      return { error: "El pago ya fue confirmado" }
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: {
        paymentConfirmed: true,
        paymentRef,
      },
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })

    revalidatePath("/memberships")
    return { success: true, membership: updated }
  } catch (error) {
    console.error("Error confirming payment:", error)
    return { error: "Error al confirmar el pago" }
  }
}
