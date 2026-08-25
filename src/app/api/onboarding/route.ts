import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      onboardingCompleted: true,
      onboardingCompletedAt: true,
      trainingFrequency: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const assignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true },
    select: { id: true },
  })

  // Rutina asignada por el coach (el plan no pertenece al miembro)
  const coachAssignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true, plan: { userId: { not: user.id } } },
    include: {
      plan: {
        include: {
          user: { select: { name: true } },
          splits: {
            orderBy: { order: "asc" },
            include: {
              exercises: {
                orderBy: { order: "asc" },
                select: {
                  sets: true,
                  reps: true,
                  weight: true,
                  restSeconds: true,
                  exercise: { select: { id: true, name: true, muscleGroup: true, equipment: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const coachPlan = coachAssignment
    ? {
        id: coachAssignment.plan.id,
        name: coachAssignment.plan.name,
        description: coachAssignment.plan.description,
        coachName: coachAssignment.plan.user?.name ?? null,
        splits: coachAssignment.plan.splits.map((s) => ({
          id: s.id,
          label: s.label,
          name: s.name,
          muscleGroups: s.muscleGroups,
          estimatedDuration: s.estimatedDuration,
          exercises: s.exercises.map((e) => ({
            id: e.exercise.id,
            name: e.exercise.name,
            muscleGroup: e.exercise.muscleGroup,
            equipment: e.exercise.equipment,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            restSeconds: e.restSeconds,
          })),
        })),
      }
    : null

  return NextResponse.json({
    onboardingCompleted: user.onboardingCompleted,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    hasRoutine: !!assignment,
    trainingFrequency: user.trainingFrequency ?? null,
    coachPlan,
  })
}

export async function POST(request: Request) {
  try {
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

    if (user.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Solo los miembros pueden completar el onboarding" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      objective,
      experienceLevel,
      trainingFrequency,
      weight,
      height,
    } = body as Record<string, unknown>

    const bmi = typeof weight === "number" && typeof height === "number"
      ? weight / ((height / 100) * (height / 100))
      : null

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        onboardingData: {
          ...body,
          bmi: bmi ? Math.round(bmi * 10) / 10 : null,
          completedAt: new Date().toISOString(),
        },
        objective: objective === "UNSURE" ? null : (objective as never),
        experienceLevel: experienceLevel as never,
        trainingFrequency: trainingFrequency as number,
        height: typeof height === "number" ? height : null,
        weight: typeof weight === "number" ? weight : null,
      },
    })

    return NextResponse.json(
      { success: true, message: "Onboarding completado", bmi: bmi ? Math.round(bmi * 10) / 10 : null },
      { status: 200 }
    )
  } catch (error) {
    console.error("[onboarding] POST error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
