import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const { classId } = body

  if (user.role === "MEMBER") {
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { endDate: "desc" },
    })
    const isActive =
      membership &&
      membership.status === "ACTIVE" &&
      membership.endDate &&
      new Date(membership.endDate) > new Date()
    if (!isActive) {
      return NextResponse.json(
        { error: "Necesitas una membresía activa para reservar una clase" },
        { status: 403 }
      )
    }
  }

  const classItem = await prisma.class.findUnique({ where: { id: classId } })
  if (!classItem) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
  }

  const existingBooking = await prisma.booking.findFirst({
    where: { userId: user.id, classId, status: "CONFIRMED" },
  })

  if (existingBooking) {
    return NextResponse.json({ error: "Ya tienes una reserva en esta clase" }, { status: 409 })
  }

  const confirmedCount = await prisma.booking.count({
    where: { classId, status: "CONFIRMED" },
  })

  if (confirmedCount >= classItem.capacity) {
    return NextResponse.json({ error: "Clase llena" }, { status: 409 })
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

  return NextResponse.json({ booking }, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const { bookingId } = body

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId: user.id },
  })

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  })

  return NextResponse.json({ success: true })
}
