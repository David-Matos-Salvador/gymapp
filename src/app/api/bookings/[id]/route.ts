import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED", "ATTENDED"]),
})

const bookingInclude = {
  classItem: {
    include: { trainer: { select: { id: true, name: true, email: true } } },
  },
  user: { select: { id: true, name: true, email: true } },
} as const

function canViewBooking(
  user: { id: string; role: string; gymId: string | null },
  booking: { userId: string; classItem: { trainerId: string; gymId: string } }
) {
  if (booking.userId === user.id) return true
  if (user.role === "SUPER_ADMIN") return true
  if (user.gymId !== booking.classItem.gymId) return false
  if (user.role === "ADMIN") return true
  return user.role === "TRAINER" && booking.classItem.trainerId === user.id
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  })

  if (!booking || !canViewBooking(user, booking)) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ booking })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { classItem: { select: { trainerId: true, gymId: true } } },
  })
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = updateBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const isOwner = booking.userId === user.id
  const isClassTrainer =
    user.role === "TRAINER" &&
    user.gymId === booking.classItem.gymId &&
    booking.classItem.trainerId === user.id
  const isAdmin =
    user.role === "SUPER_ADMIN" || (user.role === "ADMIN" && user.gymId === booking.classItem.gymId)

  if (isOwner && parsed.data.status !== "CANCELLED") {
    return NextResponse.json({ error: "Solo puedes cancelar tu propia reserva" }, { status: 403 })
  }
  if (!isOwner && !isClassTrainer && !isAdmin) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  if (parsed.data.status === "ATTENDED" && !isClassTrainer && !isAdmin) {
    return NextResponse.json(
      { error: "Solo el entrenador puede marcar asistencia" },
      { status: 403 }
    )
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: parsed.data.status },
    include: bookingInclude,
  })

  return NextResponse.json({ booking: updated })
}
