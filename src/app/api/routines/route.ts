import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.role === "MEMBER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const plans = await prisma.routinePlan.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(user.gymId
          ? [{ user: { OR: [{ gymId: user.gymId }, { role: "SUPER_ADMIN" as const }] } }]
          : [{ user: { role: "SUPER_ADMIN" as const } }]),
      ],
    },
    include: {
      splits: {
        include: {
          exercises: {
            include: {
              exercise: { include: { creator: { select: { id: true, name: true, role: true } } } },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ plans })
}

const routineExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(50),
  reps: z.union([z.string().min(1), z.number().int().min(1)]).transform(String),
  weight: z.number().min(0).max(1000),
  restSeconds: z.number().int().min(0).max(3600),
  order: z.number().int().min(0),
})

const createRoutineSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100),
  description: z.string().max(1000).nullable().optional(),
  objective: z
    .enum([
      "WEIGHT_LOSS",
      "MUSCLE_GAIN",
      "TONING",
      "STRENGTH",
      "ENDURANCE",
      "GENERAL_FITNESS",
      "REHABILITATION",
      "COMPETITION",
    ])
    .nullable()
    .optional(),
  frequency: z.number().int().min(1).max(7).nullable().optional(),
  difficulty: z.string().max(50).nullable().optional(),
  exercises: z.array(routineExerciseSchema).optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = createRoutineSchema.safeParse(body)
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors
    return NextResponse.json(
      { error: details.name ? "Nombre requerido" : "Datos inválidos", details },
      { status: 400 }
    )
  }

  const { name, description, objective, frequency, difficulty, exercises } = parsed.data

  if (user.gymId && exercises && exercises.length > 0) {
    const uniqueIds = [...new Set(exercises.map((e) => e.exerciseId))]
    const activeCount = await prisma.gymExercise.count({
      where: { gymId: user.gymId, active: true, exerciseId: { in: uniqueIds } },
    })
    if (activeCount !== uniqueIds.length) {
      return NextResponse.json(
        {
          error: "La rutina incluye ejercicios no habilitados para tu gimnasio",
          details: { exercises: ["Ejercicios no habilitados"] },
        },
        { status: 400 }
      )
    }
  }

  try {
    const plan = await prisma.routinePlan.create({
      data: {
        name,
        description: description ?? null,
        objective: objective ?? null,
        frequency: frequency ?? null,
        difficulty: difficulty ?? null,
        userId: user.id,
        splits: {
          create: [
            {
              label: "A",
              name,
              muscleGroups: [],
              exercises: exercises
                ? {
                    create: exercises.map((e) => ({
                      exerciseId: e.exerciseId,
                      sets: e.sets,
                      reps: e.reps,
                      weight: e.weight,
                      restSeconds: e.restSeconds,
                      order: e.order,
                    })),
                  }
                : undefined,
            },
          ],
        },
      },
      include: {
        splits: {
          include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        },
      },
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una rutina con ese nombre", details: { name: ["Duplicado"] } },
        { status: 409 }
      )
    }
    throw error
  }
}
