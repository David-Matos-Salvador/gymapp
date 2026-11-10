import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"
import { DEFAULT_TIMEZONE, formatAppointment } from "@/lib/coach-schedule"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateSchema = z.object({ status: z.literal("CANCELLED") })

/** Cancela una sesión. Pueden hacerlo el cliente o el coach, antes de que empiece. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!updateSchema.safeParse(body).success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const { id } = await params
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { gym: { select: { timezone: true } } },
  })
  // Quien no participa recibe 404: no revelamos que la sesión existe.
  if (!appointment || (appointment.clientId !== user.id && appointment.trainerId !== user.id)) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
  }
  if (appointment.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Solo puedes cancelar una sesión confirmada" },
      { status: 409 }
    )
  }
  if (appointment.startsAt <= new Date()) {
    return NextResponse.json(
      { error: "No puedes cancelar una sesión que ya empezó" },
      { status: 409 }
    )
  }

  const otherUserId =
    appointment.clientId === user.id ? appointment.trainerId : appointment.clientId
  const when = formatAppointment(appointment.startsAt, appointment.gym.timezone || DEFAULT_TIMEZONE)

  // updateMany con el estado en el where: si dos personas cancelan a la vez, solo una gana.
  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.appointment.updateMany({
      where: { id, status: "CONFIRMED" },
      data: { status: "CANCELLED", cancelledById: user.id, cancelledAt: new Date() },
    })
    if (count === 0) return false
    await tx.notification.create({
      data: {
        userId: otherUserId,
        title: "Sesión 1:1 cancelada",
        message: `${user.name || "La otra persona"} canceló la sesión del ${when}.`,
        type: "CLASS",
        metadata: { appointmentId: id },
      },
    })
    return true
  })

  if (!updated) {
    return NextResponse.json(
      { error: "Solo puedes cancelar una sesión confirmada" },
      { status: 409 }
    )
  }

  emitRealtime("notifications")
  return NextResponse.json({ success: true })
}
