import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const OBJECTIVE_MAP: Record<string, string> = {
  WEIGHT_LOSS: "WEIGHT_LOSS",
  MUSCLE_GAIN: "MUSCLE_GAIN",
  GENERAL_FITNESS: "GENERAL_FITNESS",
  UNSURE: "UNSURE",
}

function getDifficultyFromExperience(level?: string): string[] {
  switch (level) {
    case "ELITE":
      return ["ADVANCED", "INTERMEDIATE"]
    case "ADVANCED":
      return ["ADVANCED", "INTERMEDIATE"]
    case "INTERMEDIATE":
      return ["INTERMEDIATE", "BEGINNER"]
    default:
      return ["BEGINNER", "INTERMEDIATE"]
  }
}

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
  const targetObjective = OBJECTIVE_MAP[objective] ?? "GENERAL_FITNESS"
  const difficulties = getDifficultyFromExperience(experienceLevel)

  const superadmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  })

  if (!superadmin) {
    return NextResponse.json({ routines: [] })
  }

  const platformRoutines = await prisma.routine.findMany({
    where: {
      userId: superadmin.id,
      assignedToId: null,
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (platformRoutines.length === 0) {
    return NextResponse.json({ routines: [] })
  }

  const scored = platformRoutines.map((r) => {
    const description = (r.description ?? "").toLowerCase()
    let score = 0

    if (targetObjective === "WEIGHT_LOSS") {
      if (description.includes("quema") || description.includes("metabólico") || description.includes("cardio")) score += 3
    } else if (targetObjective === "MUSCLE_GAIN") {
      if (description.includes("hipertrofia") || description.includes("fuerza") || description.includes("masa")) score += 3
    } else if (targetObjective === "GENERAL_FITNESS") {
      if (description.includes("general") || description.includes("cuerpo completo") || description.includes("movimiento")) score += 3
    }

    if (difficulties.some((d) => description.includes(d.toLowerCase()) || r.name.toLowerCase().includes(d.toLowerCase()))) {
      score += 2
    }

    return { routine: r, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const top = scored[0].routine
  const alternates = scored.slice(1, 4).map((s) => s.routine)

  const serialize = (r: typeof top) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    exercises: r.exercises.map((e) => ({
      id: e.exercise.id,
      name: e.exercise.name,
      muscleGroup: e.exercise.muscleGroup,
      equipment: e.exercise.equipment,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
      restSeconds: e.restSeconds,
    })),
  })

  return NextResponse.json({
    recommended: serialize(top),
    alternates: alternates.map(serialize),
  })
}
