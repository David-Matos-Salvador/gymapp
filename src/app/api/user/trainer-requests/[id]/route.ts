import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateSchema = z.object({
  action: z.enum(["ACCEPTED", "REJECTED"]),
})

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const body = await request.json()
  const { action } = updateSchema.parse(body)

  const trainerRequest = await prisma.trainerRequest.findUnique({
    where: { id },
    include: { trainer: true },
  })
  if (!trainerRequest) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
  }
  if (trainerRequest.clientId !== user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  if (trainerRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Esta solicitud ya fue procesada" }, { status: 409 })
  }

  if (action === "REJECTED") {
    const updated = await     prisma.trainerRequest.update({
      where: { id },
      data: { status: "REJECTED", rejectedAt: new Date() },
    })

    await prisma.notification.updateMany({
      where: { userId: user.id, type: "TRAINER_REQUEST", read: false },
      data: { read: true },
    })

    await prisma.notification.create({
      data: {
        userId: trainerRequest.trainerId,
        title: "Solicitud rechazada",
        message: `${user.name || "Un usuario"} rechazó tu solicitud de entrenamiento.`,
        type: "INFO",
        metadata: { requestId: id },
      },
    })

    return NextResponse.json({ request: updated })
  }

  if (user.assignedTrainerId) {
    return NextResponse.json({ error: "Ya tienes un entrenador asignado" }, { status: 409 })
  }

  const existingAccepted = await prisma.trainerRequest.findFirst({
    where: { clientId: user.id, status: "ACCEPTED", id: { not: id } },
  })
  if (existingAccepted) {
    return NextResponse.json({ error: "Ya tienes una solicitud aceptada pendiente de pago" }, { status: 409 })
  }

  const now = new Date()

  const updatedRequest = await prisma.trainerRequest.update({
    where: { id },
    data: { status: "ACCEPTED", acceptedAt: now },
  })

  await prisma.notification.updateMany({
    where: { userId: user.id, type: "TRAINER_REQUEST", read: false },
    data: { read: true },
  })

  await prisma.notification.create({
    data: {
      userId: trainerRequest.trainerId,
      title: "Solicitud aceptada",
      message: `${user.name || "Un usuario"} aceptó tu solicitud. Espera a que suba su comprobante de pago para confirmarlo.`,
      type: "INFO",
      metadata: { requestId: id, clientId: user.id },
    },
  })

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: { plan: true },
  })

  return NextResponse.json({
    request: updatedRequest,
    hasActiveMembership: !!existingMembership,
    activeMembership: existingMembership || null,
  })
}
