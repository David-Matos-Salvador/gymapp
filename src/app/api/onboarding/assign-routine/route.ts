import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const assignSchema = z.object({
  routineId: z.string(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user || user.role !== "MEMBER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "routineId requerido" }, { status: 400 })
  }

  const source = await prisma.routine.findUnique({
    where: { id: parsed.data.routineId },
    include: { exercises: { orderBy: { order: "asc" } } },
  })

  if (!source) {
    return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 })
  }

  const newRoutine = await prisma.routine.create({
    data: {
      name: source.name,
      description: source.description,
      userId: source.userId,
      assignedToId: user.id,
      exercises: {
        create: source.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restSeconds: e.restSeconds,
          order: e.order,
        })),
      },
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  return NextResponse.json({
    routine: {
      id: newRoutine.id,
      name: newRoutine.name,
      description: newRoutine.description,
      exercises: newRoutine.exercises.map((e) => ({
        id: e.exercise.id,
        name: e.exercise.name,
        muscleGroup: e.exercise.muscleGroup,
        equipment: e.exercise.equipment,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        restSeconds: e.restSeconds,
      })),
    },
  })
}
