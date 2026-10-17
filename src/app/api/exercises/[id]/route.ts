import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const exerciseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  muscleGroup: z
    .enum([
      "CHEST",
      "BACK",
      "SHOULDERS",
      "BICEPS",
      "TRICEPS",
      "LEGS",
      "GLUTES",
      "ABS",
      "CALVES",
      "FOREARMS",
      "TRAPS",
      "FULL_BODY",
      "CARDIO",
    ])
    .optional(),
  equipment: z
    .enum([
      "BARBELL",
      "DUMBBELL",
      "MACHINE",
      "CABLE",
      "BODYWEIGHT",
      "KETTLEBELL",
      "BAND",
      "SMITH_MACHINE",
      "EZ_BAR",
      "BENCH",
      "PLATE",
      "OTHER",
    ])
    .optional(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  animationData: z.any().nullable().optional(),
})

async function checkExerciseOwnership(exerciseId: string, user: { id: string; role: string }) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { userId: true },
  })

  if (!exercise) return { exists: false, canEdit: false }

  const isCreator = exercise.userId === user.id
  const isSuperAdmin = user.role === "SUPER_ADMIN"
  const canEdit = isCreator || isSuperAdmin

  return { exists: true, canEdit }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        splitExercises: {
          include: {
            split: {
              include: {
                plan: true,
              },
            },
          },
        },
        gymEquipments: true,
        creator: { select: { id: true, name: true, role: true } },
      },
    })

    if (!exercise) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 })
    }

    return NextResponse.json(exercise)
  } catch (error) {
    console.error("GET /api/exercises/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { id } = await params
    const { exists, canEdit } = await checkExerciseOwnership(id, user)

    if (!exists) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 })
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar este ejercicio" },
        { status: 403 }
      )
    }

    const body = await request.json()

    const parsed = exerciseUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/exercises/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { id } = await params
    const { exists, canEdit } = await checkExerciseOwnership(id, user)

    if (!exists) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 })
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este ejercicio" },
        { status: 403 }
      )
    }

    await prisma.exercise.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/exercises/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
