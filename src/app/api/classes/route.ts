import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createClassSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  capacity: z.number().int().min(1).max(200),
  duration: z.number().int().min(15).max(240),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:mm)"),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { gymId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const classes = await prisma.class.findMany({
    where: { gymId: user.gymId ?? "__no_gym__", active: true },
    include: {
      trainer: { select: { name: true } },
      bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
    },
    orderBy: { startTime: "asc" },
  })

  const publicClasses = classes.map(({ bookings, ...classItem }) => ({
    ...classItem,
    confirmedCount: bookings.length,
  }))

  return NextResponse.json({ classes: publicClasses })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  if (!user.gymId) {
    return NextResponse.json({ error: "Sin gimnasio asignado" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createClassSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const classItem = await prisma.class.create({
    data: {
      ...parsed.data,
      trainerId: user.id,
      gymId: user.gymId,
    },
    include: {
      trainer: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ class: classItem }, { status: 201 })
}
