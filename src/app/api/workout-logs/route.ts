import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const setLogSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  setNumber: z.number().int().positive(),
  reps: z.number().int().min(0).default(0),
  weight: z.number().min(0).default(0),
  restSeconds: z.number().int().min(0).default(60),
  completed: z.boolean().default(true),
  notes: z.string().optional(),
})

const createWorkoutLogSchema = z.object({
  splitId: z.string().optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  sets: z.array(setLogSchema).min(1),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const skip = (page - 1) * limit

  const total = await prisma.workoutLog.count({ where: { userId: user.id } })

  const workoutLogs = await prisma.workoutLog.findMany({
    where: { userId: user.id },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      split: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
    skip,
    take: limit,
  })

  return NextResponse.json({
    workoutLogs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
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
  const parsed = createWorkoutLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { splitId, duration, notes, sets } = parsed.data

  const workoutLog = await prisma.workoutLog.create({
    data: {
      userId: user.id,
      splitId,
      duration,
      notes,
      sets: {
        create: sets.map((s) => ({
          exerciseId: s.exerciseId,
          exerciseName: s.exerciseName,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
          restSeconds: s.restSeconds,
          completed: s.completed,
          notes: s.notes,
        })),
      },
    },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  })

  return NextResponse.json({ workoutLog }, { status: 201 })
}
