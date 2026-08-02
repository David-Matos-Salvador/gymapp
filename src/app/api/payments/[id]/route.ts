import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action, notes } = updateSchema.parse(body)

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
  }
  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 409 })
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN"

  if (action === "CONFIRM") {
    const paymentUser = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { assignedTrainerId: true, name: true },
    })

    if (paymentUser?.assignedTrainerId && paymentUser.assignedTrainerId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Este usuario ya tiene otro entrenador asignado" }, { status: 403 })
    }

    const hasAcceptedRequest = await prisma.trainerRequest.findFirst({
      where: { trainerId: user.id, clientId: payment.userId, status: "ACCEPTED" },
    })

    const isAlreadyMyClient = paymentUser?.assignedTrainerId === user.id

    if (!hasAcceptedRequest && !isAlreadyMyClient && !isAdmin) {
      return NextResponse.json({ error: "Solo puedes confirmar pagos de tus clientes o de usuarios que aceptaron tu solicitud" }, { status: 403 })
    }

    const shouldAssignTrainer =
      !paymentUser?.assignedTrainerId && hasAcceptedRequest ? user.id : undefined

    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id },
        data: {
          status: "COMPLETED",
          confirmedById: user.id,
          confirmedAt: new Date(),
          notes: notes || null,
        },
      }),
      prisma.membership.updateMany({
        where: { userId: payment.userId, paymentConfirmed: false, status: "ACTIVE" },
        data: { paymentConfirmed: true },
      }),
      ...(shouldAssignTrainer
        ? [
            prisma.user.update({
              where: { id: payment.userId },
              data: { assignedTrainerId: user.id },
            }),
            prisma.trainerRequest.updateMany({
              where: { clientId: payment.userId, trainerId: user.id, status: "ACCEPTED" },
              data: { status: "REJECTED", rejectedAt: new Date() },
            }),
          ]
        : []),
    ])

    const notificationMessage = shouldAssignTrainer
      ? `Tu comprobante fue verificado. ${user.name || "Tu entrenador"} es ahora tu coach asignado. ¡Tu membresía está activa!`
      : "Tu comprobante de pago fue verificado. ¡Tu membresía está activa!"

    await prisma.notification.create({
      data: {
        userId: payment.userId,
        title: "Pago confirmado",
        message: notificationMessage,
        type: "PAYMENT",
        metadata: { paymentId: id },
      },
    })

    return NextResponse.json({ payment: updatedPayment })
  }

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id },
      data: {
        status: "FAILED",
        confirmedById: user.id,
        confirmedAt: new Date(),
        notes: notes || "Pago rechazado",
      },
    }),
    prisma.membership.updateMany({
      where: { userId: payment.userId, paymentConfirmed: false, status: "ACTIVE" },
      data: { status: "SUSPENDED" },
    }),
  ])

  await prisma.notification.create({
    data: {
      userId: payment.userId,
      title: "Pago rechazado",
      message: notes || "Tu comprobante de pago fue rechazado. Contacta a tu entrenador.",
      type: "PAYMENT",
      metadata: { paymentId: id },
    },
  })

  return NextResponse.json({ payment: updatedPayment })
}
