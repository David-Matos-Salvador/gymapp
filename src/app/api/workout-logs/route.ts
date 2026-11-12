import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SET_LIMITS } from "@/constants/workout"

const setLogSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  setNumber: z.number().int().positive(),
  reps: z.number().int().min(SET_LIMITS.reps.min).max(SET_LIMITS.reps.max),
  weight: z.number().min(SET_LIMITS.weight.min).max(SET_LIMITS.weight.max).default(0),
  restSeconds: z.number().int().min(0).default(60),
  completed: z.boolean().default(true),
  notes: z.string().optional(),
})

const createWorkoutLogSchema = z.object({
  splitId: z.string().min(1),
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

  const split = await prisma.routineSplit.findFirst({
    where: {
      id: splitId,
      plan: { assignments: { some: { userId: user.id, active: true } } },
    },
    select: {
      exercises: {
        select: { exerciseId: true, exercise: { select: { name: true } } },
      },
    },
  })
  if (!split) {
    return NextResponse.json({ error: "Rutina no asignada" }, { status: 403 })
  }

  const exerciseNames = new Map(
    split.exercises.map((exercise) => [exercise.exerciseId, exercise.exercise.name])
  )
  const invalid = sets.find((set) => !exerciseNames.has(set.exerciseId))
  if (invalid) {
    return NextResponse.json(
      { error: "El ejercicio no pertenece a la rutina", details: { exerciseId: ["Inválido"] } },
      { status: 400 }
    )
  }

  const workoutLog = await prisma.workoutLog.create({
    data: {
      userId: user.id,
      splitId,
      duration,
      notes,
      sets: {
        create: sets.map((s) => ({
          exerciseId: s.exerciseId,
          exerciseName: exerciseNames.get(s.exerciseId) ?? s.exerciseName,
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
