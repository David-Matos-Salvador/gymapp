import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin } from "@/lib/authz"

const manualPaymentSchema = z.object({
  membershipId: z.string().min(1),
  method: z.enum(["CASH", "TRANSFER", "CARD", "YAPE", "OTHER"]).default("CASH"),
  reference: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true, name: true },
  })
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = manualPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.membershipId },
    include: {
      plan: true,
      user: { select: { id: true, name: true, gymId: true } },
    },
  })
  if (!membership) {
    return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 })
  }
  if (!isSuperAdmin(user.role) && membership.user.gymId !== user.gymId) {
    return NextResponse.json({ error: "Sin permisos sobre este gimnasio" }, { status: 403 })
  }
  if (membership.paymentConfirmed) {
    return NextResponse.json({ error: "La membresía ya está pagada" }, { status: 409 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        userId: membership.userId,
        membershipId: membership.id,
        amount: membership.plan.price,
        currency: membership.plan.currency,
        status: "COMPLETED",
        method: parsed.data.method,
        type: "MEMBERSHIP",
        reference: parsed.data.reference || null,
        confirmedById: user.id,
        confirmedAt: new Date(),
      },
    })

    const updatedMembership = await tx.membership.update({
      where: { id: membership.id },
      data: {
        paymentConfirmed: true,
        paymentMethod: parsed.data.method,
        paymentRef: parsed.data.reference || null,
      },
    })

    await tx.notification.create({
      data: {
        userId: membership.userId,
        title: "Pago registrado",
        message: `Se registró tu pago de ${membership.plan.currency.toUpperCase()} ${membership.plan.price} (${parsed.data.method}).`,
        type: "PAYMENT",
        metadata: { paymentId: payment.id, membershipId: membership.id },
      },
    })

    return { payment, membership: updatedMembership }
  })

  return NextResponse.json(result, { status: 201 })
}
