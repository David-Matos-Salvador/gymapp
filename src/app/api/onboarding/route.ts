import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

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

  const assignedRoutine = await prisma.routine.findFirst({
    where: { assignedToId: user.id },
    select: { id: true },
  })

  return NextResponse.json({
    onboardingCompleted: user.onboardingCompleted,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    hasRoutine: !!assignedRoutine,
    trainingFrequency: user.trainingFrequency ?? null,
  })
}

const onboardingSchema = z.object({
  objective: z.enum(["WEIGHT_LOSS", "MUSCLE_GAIN", "GENERAL_FITNESS", "UNSURE"]),
  trainingHistory: z.enum(["NONE", "ONCE", "TWO_TO_THREE", "FOUR_PLUS"]),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]),
  desiredFrequency: z.enum(["ONE", "TWO", "THREE_PLUS"]),
  physicalConditions: z.array(z.string()),
  weight: z.number().min(20).max(300),
  height: z.number().min(100).max(250),
  usualSchedule: z.enum([
    "BEFORE_8AM",
    "8AM_11AM",
    "11AM_2PM",
    "2PM_5PM",
    "5PM_7PM",
    "7PM_9PM",
    "AFTER_9PM",
  ]),
  trainingFrequency: z.number().int().min(3).max(5).optional(),
})

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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = onboardingSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return NextResponse.json({ error: "Datos inválidos", fieldErrors }, { status: 400 })
  }

  const {
    objective,
    trainingHistory,
    experienceLevel,
    desiredFrequency,
    physicalConditions,
    weight,
    height,
    usualSchedule,
    trainingFrequency,
  } = parsed.data

  const bmi = weight / ((height / 100) * (height / 100))

  await prisma.user.update({
    where: { id: user.id },
    data: {
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      onboardingData: {
        objective,
        trainingHistory,
        experienceLevel,
        desiredFrequency,
        physicalConditions,
        weight,
        height,
        bmi: Math.round(bmi * 10) / 10,
        usualSchedule,
        completedAt: new Date().toISOString(),
      },
      objective: objective === "UNSURE" ? null : objective,
      experienceLevel,
      trainingFrequency: trainingFrequency ?? undefined,
    },
  })

  return NextResponse.json(
    { success: true, message: "Onboarding completado", bmi: Math.round(bmi * 10) / 10 },
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
