import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateClassSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  capacity: z.number().int().min(1).max(200).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  dayOfWeek: z
    .enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])
    .optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)")
    .optional(),
})

function canManageClass(
  user: { id: string; role: string; gymId: string | null },
  classItem: { trainerId: string; gymId: string }
) {
  if (user.role === "SUPER_ADMIN") return true
  if (user.gymId !== classItem.gymId) return false
  if (user.role === "ADMIN") return true
  return user.role === "TRAINER" && classItem.trainerId === user.id
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
  const classItem = await prisma.class.findUnique({
    where: { id },
    include: {
      trainer: { select: { id: true, name: true, email: true } },
      bookings: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!classItem || !canManageClass(user, classItem)) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ class: classItem })
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
  const classItem = await prisma.class.findUnique({
    where: { id },
    select: { trainerId: true, gymId: true, capacity: true, active: true },
  })
  if (!classItem || !classItem.active || !canManageClass(user, classItem)) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = updateClassSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  if (parsed.data.capacity && parsed.data.capacity < classItem.capacity) {
    const confirmed = await prisma.booking.count({
      where: { classId: id, status: "CONFIRMED" },
    })
    if (parsed.data.capacity < confirmed) {
      return NextResponse.json(
        {
          error: `La capacidad no puede ser menor a las ${confirmed} reservas confirmadas`,
          details: { capacity: ["Capacidad insuficiente"] },
        },
        { status: 409 }
      )
    }
  }

  const updated = await prisma.class.update({
    where: { id },
    data: parsed.data,
    include: { trainer: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ class: updated })
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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
  const classItem = await prisma.class.findUnique({
    where: { id },
    select: { trainerId: true, gymId: true, active: true, name: true },
  })
  if (!classItem || !classItem.active || !canManageClass(user, classItem)) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
  }

  const booked = await prisma.booking.findMany({
    where: { classId: id, status: "CONFIRMED" },
    select: { userId: true },
  })

  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { classId: id, status: { in: ["CONFIRMED", "ATTENDED"] } },
      data: { status: "CANCELLED" },
    }),
    prisma.class.update({ where: { id }, data: { active: false } }),
  ])

  if (booked.length > 0) {
    await prisma.notification.createMany({
      data: booked.map((booking) => ({
        userId: booking.userId,
        title: "Clase cancelada",
        message: `La clase ${classItem.name} fue cancelada.`,
        type: "INFO",
        metadata: { classId: id },
      })),
    })
  }

  emitRealtime("notifications", classItem.gymId)
  return NextResponse.json({ success: true })
}
