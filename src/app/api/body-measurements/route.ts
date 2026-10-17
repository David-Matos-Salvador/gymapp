import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"

const createMeasurementSchema = z.object({
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bodyFat: z.number().min(0).max(100).optional(),
  muscleMass: z.number().positive().optional(),
  bmi: z.number().optional(),
  neck: z.number().positive().optional(),
  shoulders: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  leftArm: z.number().positive().optional(),
  rightArm: z.number().positive().optional(),
  leftForearm: z.number().positive().optional(),
  rightForearm: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  leftThigh: z.number().positive().optional(),
  rightThigh: z.number().positive().optional(),
  leftCalf: z.number().positive().optional(),
  rightCalf: z.number().positive().optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const measurements = await prisma.bodyMeasurement.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  })

  return NextResponse.json({ measurements })
}

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
  const parsed = createMeasurementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const data = parsed.data
  let targetUserId = user.id

  if (data.userId && data.userId !== user.id) {
    if (user.role === "ADMIN") {
      targetUserId = data.userId
    } else if (user.role === "TRAINER") {
      const clientIds = await getTrainerClientIds(user.id)
      if (!clientIds.includes(data.userId)) {
        return NextResponse.json({ error: "El miembro no es tu cliente" }, { status: 403 })
      }
      targetUserId = data.userId
    } else {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
  }

  const measurement = await prisma.bodyMeasurement.create({
    data: {
      userId: targetUserId,
      ...parsed.data,
      date: new Date(),
    },
  })

  return NextResponse.json({ measurement }, { status: 201 })
}
