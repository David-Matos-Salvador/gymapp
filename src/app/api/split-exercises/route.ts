import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addExerciseSchema = z.object({
  splitId: z.string().min(1),
  exerciseId: z.string().min(1),
  sets: z.number().int().default(3),
  reps: z.string().default("10"),
  weight: z.number().default(0),
  restSeconds: z.number().int().default(60),
  order: z.number().int().default(0),
  notes: z.string().nullable().optional(),
})

async function canEditSplit(splitId: string, user: { id: string; role: string }) {
  const split = await prisma.routineSplit.findUnique({
    where: { id: splitId },
    select: { plan: { select: { userId: true } } },
  })
  if (!split) return false
  return split.plan.userId === user.id || user.role === "SUPER_ADMIN"
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = addExerciseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    if (!(await canEditSplit(parsed.data.splitId, user))) {
      return NextResponse.json({ error: "No tienes permisos para modificar esta rutina" }, { status: 403 })
    }

    const splitExercise = await prisma.routineSplitExercise.create({
      data: {
        splitId: parsed.data.splitId,
        exerciseId: parsed.data.exerciseId,
        sets: parsed.data.sets,
        reps: parsed.data.reps,
        weight: parsed.data.weight,
        restSeconds: parsed.data.restSeconds,
        order: parsed.data.order,
        notes: parsed.data.notes ?? null,
      },
      include: {
        exercise: true,
      },
    })

    return NextResponse.json({ splitExercise }, { status: 201 })
  } catch (error) {
    console.error("POST /api/split-exercises:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}