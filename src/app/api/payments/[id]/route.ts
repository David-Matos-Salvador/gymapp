import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateSchema = z.object({
  action: z.enum(["CONFIRM", "REJECT"]),
  notes: z.string().optional(),
})

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true, name: true },
  })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { action, notes } = parsed.data

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          gymId: true,
          assignedTrainerId: true,
        },
      },
    },
  })
  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
  }
  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 409 })
  }

  if (user.role === "ADMIN" && payment.user.gymId !== user.gymId) {
    return NextResponse.json({ error: "Sin permisos sobre este gimnasio" }, { status: 403 })
  }

  if (
    user.role === "TRAINER" &&
    (payment.user.gymId !== user.gymId || payment.user.assignedTrainerId !== user.id)
  ) {
    return NextResponse.json(
      { error: "Solo puedes gestionar pagos de tus clientes" },
      { status: 403 }
    )
  }

  // D-07: membership side effects only apply to MEMBERSHIP payments. The
  // target is the user's unconfirmed membership: 0 means no-op, more than one
  // is ambiguous and must be rejected.
  let targetMembershipId: string | null = null
  if (payment.type === "MEMBERSHIP") {
    if (payment.membershipId) {
      const target = await prisma.membership.findUnique({
        where: { id: payment.membershipId },
        select: { id: true, userId: true, endDate: true, paymentConfirmed: true },
      })
      if (!target || target.userId !== payment.userId) {
        return NextResponse.json(
          { error: "El pago apunta a una membresía inválida" },
          { status: 409 }
        )
      }
      if (target.endDate <= new Date()) {
        return NextResponse.json(
          { error: "La membresía venció. Renovala antes de confirmar el pago." },
          { status: 409 }
        )
      }
      targetMembershipId = target.id
    } else {
      const unconfirmedMemberships = await prisma.membership.findMany({
        where: { userId: payment.userId, paymentConfirmed: false },
        select: { id: true },
        take: 2,
      })
      if (unconfirmedMemberships.length > 1) {
        return NextResponse.json(
          { error: "Hay más de una membresía sin confirmar para este usuario" },
          { status: 409 }
        )
      }
      targetMembershipId = unconfirmedMemberships[0]?.id ?? null
    }
  }

  if (action === "CONFIRM") {
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Atomic guard: only a PENDING payment can transition.
      const claimed = await tx.payment.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "COMPLETED",
          confirmedById: user.id,
          confirmedAt: new Date(),
          notes: notes || null,
        },
      })
      if (claimed.count === 0) return null

      // Set the one-way gate on the unconfirmed membership, copy the payment
      // method/reference, and leave status and dates untouched. If there is no
      // unconfirmed membership, this is a no-op.
      if (targetMembershipId) {
        await tx.membership.updateMany({
          where: { id: targetMembershipId, paymentConfirmed: false },
          data: {
            paymentConfirmed: true,
            paymentMethod: payment.method,
            paymentRef: payment.reference,
          },
        })
      }

      return tx.payment.findUnique({ where: { id } })
    })

    if (!updatedPayment) {
      return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 409 })
    }

    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: "Pago confirmado",
        message: "Tu comprobante de pago fue verificado. ¡Tu membresía está activa!",
        type: "PAYMENT",
        metadata: { paymentId: id },
      },
    })

    emitRealtime("pending-count")
    emitRealtime("notifications")

    return NextResponse.json({ payment: updatedPayment })
  }

  // D-07: rejecting never revokes an already-confirmed membership, and an
  // unconfirmed membership simply stays unconfirmed. Status/dates are not
  // touched.
  const updatedPayment = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "FAILED",
        confirmedById: user.id,
        confirmedAt: new Date(),
        notes: notes || "Pago rechazado",
      },
    })
    if (claimed.count === 0) return null
    return tx.payment.findUnique({ where: { id } })
  })

  if (!updatedPayment) {
    return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 409 })
  }

  await prisma.notification.create({
    data: {
      userId: payment.userId,
      title: "Pago rechazado",
      message: notes || "Tu comprobante de pago fue rechazado. Contacta a tu entrenador.",
      type: "PAYMENT",
      metadata: { paymentId: id },
    },
  })

  emitRealtime("pending-count")
  emitRealtime("notifications")

  return NextResponse.json({ payment: updatedPayment })
}
