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
    where: { active: true },
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
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Solo el superadmin puede modificar el catálogo global de ejercicios" },
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

    const exercise = await prisma.$transaction(async (tx) => {
      const created = await tx.exercise.create({
        data: {
          ...parsed.data,
          userId: user.id,
        },
      })

      const gyms = await tx.gym.findMany({
        where: { active: true },
        select: { id: true },
      })
      if (gyms.length > 0) {
        await tx.gymExercise.createMany({
          data: gyms.map((gym) => ({
            gymId: gym.id,
            exerciseId: created.id,
            active: false,
          })),
          skipDuplicates: true,
        })
      }

      return created
    })

    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un ejercicio con ese nombre", details: { name: ["Duplicado"] } },
        { status: 409 }
      )
    }
    console.error("POST /api/exercises:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
