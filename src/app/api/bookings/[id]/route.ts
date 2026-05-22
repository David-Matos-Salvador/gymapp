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

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      classItem: {
        include: { trainer: { select: { id: true, name: true, email: true } } },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ booking })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  const isOwner = booking.userId === user.id
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN"
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: parsed.data.status },
    include: {
      classItem: {
        include: { trainer: { select: { id: true, name: true, email: true } } },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ booking: updated })
}
