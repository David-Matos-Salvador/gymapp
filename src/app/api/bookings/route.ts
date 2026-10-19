import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const BOOKING_INCLUDE = {
  classItem: {
    include: { trainer: { select: { name: true } } },
  },
} as const

// Explicit bounds so a stuck lock/transaction fails fast instead of hanging the request.
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const classId = (body as { classId?: unknown } | null)?.classId
  if (typeof classId !== "string" || classId.trim().length === 0) {
    return NextResponse.json({ error: "classId es requerido" }, { status: 400 })
  }
  const requestedGymId = (body as { gymId?: unknown } | null)?.gymId

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Pessimistic lock on the class row: every capacity check for this class
      // is serialized, so concurrent requests cannot both observe a free seat.
      const locked = await tx.$queryRaw<
        Array<{ id: string; capacity: number; gymId: string; trainerId: string; active: boolean }>
      >`
        SELECT id, capacity, "gymId", "trainerId", active FROM "Class" WHERE id = ${classId} FOR UPDATE
      `
      if (locked.length === 0) {
        return { status: 404, body: { error: "Clase no encontrada" } }
      }

      const classItem = locked[0]
      if (!classItem.active) {
        return { status: 404, body: { error: "Clase no encontrada" } }
      }
      const gymId =
        user.role === "SUPER_ADMIN" && typeof requestedGymId === "string"
          ? requestedGymId
          : user.gymId
      if (!gymId || classItem.gymId !== gymId) {
        return { status: 404, body: { error: "Clase no encontrada" } }
      }
      if (classItem.trainerId === user.id) {
        return { status: 403, body: { error: "No puedes reservar una clase que dictas" } }
      }

      const membership = await tx.membership.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          endDate: { gt: new Date() },
          paymentConfirmed: true,
        },
        orderBy: { endDate: "desc" },
      })
      if (!membership) {
        return {
          status: 403,
          body: { error: "Necesitas una membresía activa y confirmada para reservar una clase" },
        }
      }

      const capacity = classItem.capacity

      const existing = await tx.booking.findUnique({
        where: { userId_classId: { userId: user.id, classId } },
      })

      if (existing && (existing.status === "CONFIRMED" || existing.status === "ATTENDED")) {
        return { status: 409, body: { error: "Ya tienes una reserva en esta clase" } }
      }

      const confirmedCount = await tx.booking.count({
        where: { classId, status: "CONFIRMED" },
      })
      if (confirmedCount >= capacity) {
        return { status: 409, body: { error: "Clase llena" } }
      }

      if (existing) {
        // A cancelled booking is reused instead of inserted, preserving
        // @@unique([userId, classId]) and avoiding P2002 on re-booking.
        const booking = await tx.booking.update({
          where: { id: existing.id },
          data: { status: "CONFIRMED" },
          include: BOOKING_INCLUDE,
        })
        return { status: 201, body: { booking } }
      }

      const booking = await tx.booking.create({
        data: { userId: user.id, classId, status: "CONFIRMED" },
        include: BOOKING_INCLUDE,
      })
      return { status: 201, body: { booking } }
    }, TRANSACTION_OPTIONS)

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya tienes una reserva en esta clase" }, { status: 409 })
    }
    throw error
  }
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
  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Solo podés cancelar una reserva confirmada" },
      { status: 409 }
    )
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  })

  return NextResponse.json({ success: true })
}
