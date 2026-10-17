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
    select: { id: true, role: true, onboardingData: true },
  })

  if (!user || user.role !== "MEMBER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const data = user.onboardingData as Record<string, unknown> | null
  if (!data) {
    return NextResponse.json({ error: "Onboarding no completado" }, { status: 400 })
  }

  const objective = (data.objective as string) ?? "UNSURE"
  const experienceLevel = (data.experienceLevel as string) ?? "BEGINNER"

  const targetObjective = objective === "UNSURE" ? "GENERAL_FITNESS" : objective
  const difficultyOrder = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]
  const expIndex = difficultyOrder.indexOf(experienceLevel)
  const acceptedDifficulty = [
    experienceLevel,
    ...(expIndex > 0 ? [difficultyOrder[expIndex - 1]] : []),
    ...(expIndex < difficultyOrder.length - 1 ? [difficultyOrder[expIndex + 1]] : []),
  ]

  const superadmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  })

  if (!superadmin) {
    return NextResponse.json({ plans: [] })
  }

  const plans = await prisma.routinePlan.findMany({
    where: { userId: superadmin.id },
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  })

  if (plans.length === 0) {
    return NextResponse.json({ plans: [] })
  }

  const scored = plans.map((p) => {
    const desc = (p.description ?? "").toLowerCase()
    let score = 0

    if (p.objective === targetObjective) score += 4
    if (acceptedDifficulty.includes(p.difficulty ?? "")) score += 3
    if (p.frequency === (data.trainingFrequency as number)) score += 2

    if (
      targetObjective === "WEIGHT_LOSS" &&
      (desc.includes("quema") || desc.includes("metabólico"))
    )
      score += 2
    if (
      targetObjective === "MUSCLE_GAIN" &&
      (desc.includes("hipertrofia") || desc.includes("masa") || desc.includes("push-pull"))
    )
      score += 2

    return { plan: p, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const top = scored[0].plan
  const alternates = scored.slice(1, 4).map((s) => s.plan)

  const serializePlan = (p: typeof top) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    objective: p.objective,
    frequency: p.frequency,
    difficulty: p.difficulty,
    splits: p.splits.map((s) => ({
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
  })

  return NextResponse.json({
    recommended: serializePlan(top),
    alternates: alternates.map(serializePlan),
  })
}
