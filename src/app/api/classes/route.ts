import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const classes = await prisma.class.findMany({
    include: {
      trainer: { select: { id: true, name: true, email: true } },
      bookings: { select: { id: true, userId: true, status: true } },
    },
    orderBy: { startTime: "asc" },
  })

  return NextResponse.json({ classes })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, capacity, duration, dayOfWeek, startTime } = body

  if (!name || !capacity || !duration || !dayOfWeek || !startTime) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const classItem = await prisma.class.create({
    data: {
      name,
      description,
      trainerId: user.id,
      capacity,
      duration,
      dayOfWeek,
      startTime,
    },
    include: {
      trainer: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ class: classItem }, { status: 201 })
}
