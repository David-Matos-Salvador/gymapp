import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const exerciseCreateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  muscleGroup: z.enum([
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
  ]),
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
    .default("OTHER"),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
})

export async function GET() {
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    include: {
      creator: { select: { id: true, name: true, role: true } },
    },
  })

  return NextResponse.json({ exercises })
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (
      !user ||
      (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "TRAINER")
    ) {
      return NextResponse.json(
        { error: "No tienes permisos para crear ejercicios" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = exerciseCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const exercise = await prisma.exercise.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    })

    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    console.error("POST /api/exercises:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
