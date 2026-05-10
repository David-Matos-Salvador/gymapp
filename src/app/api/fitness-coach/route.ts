import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MuscleGroup, Equipment } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

const fitnessCoachSchema = z.object({
  objective: z.enum(["WEIGHT_LOSS", "MUSCLE_GAIN", "GENERAL_FITNESS", "UNSURE"]),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]),
  trainingFrequency: z.number().int().min(3).max(5),
})

const SPLIT_TEMPLATES: Record<number, { name: string; focus: string; level: string; muscleGroups: string[][] }[]> = {
  3: [
    { name: "Full Body A", focus: "Cuerpo completo", level: "BEGINNER", muscleGroups: [["FULL_BODY"], ["FULL_BODY"], ["FULL_BODY"]] },
    { name: "Torso / Piernas", focus: "Fuerza", level: "INTERMEDIATE", muscleGroups: [["CHEST", "BACK", "SHOULDERS"], ["LEGS", "GLUTES", "CALVES"], ["FULL_BODY"]] },
    { name: "Empuje / Tirón / Piernas", focus: "Hipertrofia", level: "INTERMEDIATE", muscleGroups: [["CHEST", "SHOULDERS", "TRICEPS"], ["BACK", "BICEPS", "FOREARMS"], ["LEGS", "GLUTES", "CALVES"]] },
  ],
  4: [
    { name: "Superior / Inferior", focus: "Crecimiento muscular", level: "INTERMEDIATE", muscleGroups: [["CHEST", "SHOULDERS", "TRICEPS"], ["BACK", "BICEPS"], ["LEGS", "GLUTES"], ["FULL_BODY"]] },
    { name: "Empuje / Tirón / Piernas / Full Body", focus: "Hipertrofia", level: "ADVANCED", muscleGroups: [["CHEST", "SHOULDERS", "TRICEPS"], ["BACK", "BICEPS"], ["LEGS", "GLUTES", "CALVES"], ["FULL_BODY"]] },
    { name: "Pecho+Tríceps / Espalda+Bíceps / Piernas / Hombros+Abs", focus: "Definición", level: "INTERMEDIATE", muscleGroups: [["CHEST", "TRICEPS"], ["BACK", "BICEPS"], ["LEGS", "GLUTES", "CALVES"], ["SHOULDERS", "ABS"]] },
  ],
  5: [
    { name: "Pecho+Tríceps / Espalda+Bíceps / Piernas / Hombros / Full Body", focus: "Rendimiento máximo", level: "ADVANCED", muscleGroups: [["CHEST", "TRICEPS"], ["BACK", "BICEPS"], ["LEGS", "GLUTES"], ["SHOULDERS"], ["FULL_BODY"]] },
    { name: "Pecho / Espalda / Piernas / Hombros / Brazos", focus: "Definición", level: "ADVANCED", muscleGroups: [["CHEST"], ["BACK"], ["LEGS", "GLUTES", "CALVES"], ["SHOULDERS"], ["BICEPS", "TRICEPS"]] },
    { name: "Hipertrofia Superior / Inferior / Empuje / Tirón / Full Body", focus: "Volumen", level: "ELITE", muscleGroups: [["CHEST", "SHOULDERS"], ["LEGS", "GLUTES"], ["CHEST", "TRICEPS"], ["BACK", "BICEPS"], ["FULL_BODY"]] },
  ],
}

const EXERCISES_BY_MUSCLE: Record<string, Array<{ name: string; sets: number; reps: number; restSeconds: number; equipment: string }>> = {
  CHEST: [
    { name: "Press banca con barra", sets: 4, reps: 10, restSeconds: 90, equipment: "BARBELL" },
    { name: "Press inclinado con mancuernas", sets: 3, reps: 12, restSeconds: 75, equipment: "DUMBBELL" },
    { name: "Aperturas con mancuernas", sets: 3, reps: 12, restSeconds: 60, equipment: "DUMBBELL" },
    { name: "Press declinado", sets: 3, reps: 10, restSeconds: 90, equipment: "BARBELL" },
    { name: "Fondos en paralelas", sets: 3, reps: 10, restSeconds: 75, equipment: "BODYWEIGHT" },
    { name: "Crossover con cables", sets: 3, reps: 15, restSeconds: 60, equipment: "CABLE" },
    { name: "Press con máquina", sets: 4, reps: 10, restSeconds: 75, equipment: "MACHINE" },
  ],
  BACK: [
    { name: "Dominadas", sets: 3, reps: 8, restSeconds: 90, equipment: "BODYWEIGHT" },
    { name: "Remo con barra", sets: 4, reps: 10, restSeconds: 90, equipment: "BARBELL" },
    { name: "Jalón al pecho", sets: 3, reps: 12, restSeconds: 75, equipment: "CABLE" },
    { name: "Remo con mancuerna a una mano", sets: 3, reps: 10, restSeconds: 75, equipment: "DUMBBELL" },
    { name: "Peso muerto", sets: 4, reps: 6, restSeconds: 120, equipment: "BARBELL" },
    { name: "Pull-over con mancuerna", sets: 3, reps: 12, restSeconds: 60, equipment: "DUMBBELL" },
    { name: "Remo en máquina", sets: 3, reps: 10, restSeconds: 75, equipment: "MACHINE" },
  ],
  SHOULDERS: [
    { name: "Press militar con barra", sets: 4, reps: 10, restSeconds: 90, equipment: "BARBELL" },
    { name: "Elevaciones laterales", sets: 3, reps: 15, restSeconds: 60, equipment: "DUMBBELL" },
    { name: "Pájaro posterior", sets: 3, reps: 12, restSeconds: 60, equipment: "DUMBBELL" },
    { name: "Press Arnold", sets: 3, reps: 10, restSeconds: 75, equipment: "DUMBBELL" },
    { name: "Elevaciones frontales", sets: 3, reps: 12, restSeconds: 60, equipment: "DUMBBELL" },
    { name: "Encogimientos de hombros", sets: 3, reps: 12, restSeconds: 75, equipment: "DUMBBELL" },
  ],
  BICEPS: [
    { name: "Curl con barra", sets: 3, reps: 12, restSeconds: 60, equipment: "BARBELL" },
    { name: "Curl martillo", sets: 3, reps: 12, restSeconds: 60, equipment: "DUMBBELL" },
    { name: "Curl predicador", sets: 3, reps: 10, restSeconds: 60, equipment: "EZ_BAR" },
    { name: "Curl concentrado", sets: 3, reps: 12, restSeconds: 60, equipment: "DUMBBELL" },
    { name: "Curl con cable", sets: 3, reps: 15, restSeconds: 45, equipment: "CABLE" },
  ],
  TRICEPS: [
    { name: "Press francés con barra", sets: 3, reps: 12, restSeconds: 60, equipment: "EZ_BAR" },
    { name: "Extensión en polea", sets: 3, reps: 12, restSeconds: 60, equipment: "CABLE" },
    { name: "Fondos en banco", sets: 3, reps: 15, restSeconds: 60, equipment: "BODYWEIGHT" },
    { name: "Press cerrado", sets: 3, reps: 10, restSeconds: 75, equipment: "BARBELL" },
    { name: "Patada de tríceps", sets: 3, reps: 12, restSeconds: 60, equipment: "DUMBBELL" },
  ],
  LEGS: [
    { name: "Sentadilla con barra", sets: 4, reps: 10, restSeconds: 120, equipment: "BARBELL" },
    { name: "Prensa de piernas", sets: 3, reps: 12, restSeconds: 90, equipment: "MACHINE" },
    { name: "Extensión de cuádriceps", sets: 3, reps: 12, restSeconds: 75, equipment: "MACHINE" },
    { name: "Curl femoral", sets: 3, reps: 12, restSeconds: 75, equipment: "MACHINE" },
    { name: "Zancadas con mancuernas", sets: 3, reps: 10, restSeconds: 75, equipment: "DUMBBELL" },
    { name: "Sentadilla búlgara", sets: 3, reps: 10, restSeconds: 90, equipment: "DUMBBELL" },
    { name: "Peso muerto rumano", sets: 3, reps: 10, restSeconds: 90, equipment: "BARBELL" },
  ],
  GLUTES: [
    { name: "Hip thrust con barra", sets: 4, reps: 12, restSeconds: 90, equipment: "BARBELL" },
    { name: "Puente de glúteos", sets: 3, reps: 12, restSeconds: 75, equipment: "BODYWEIGHT" },
    { name: "Patada de glúteo en polea", sets: 3, reps: 15, restSeconds: 60, equipment: "CABLE" },
    { name: "Sentadilla sumo", sets: 3, reps: 10, restSeconds: 90, equipment: "DUMBBELL" },
  ],
  CALVES: [
    { name: "Elevación de talones de pie", sets: 4, reps: 20, restSeconds: 45, equipment: "MACHINE" },
    { name: "Elevación de talones sentado", sets: 4, reps: 15, restSeconds: 45, equipment: "MACHINE" },
    { name: "Elevación de talones en prensa", sets: 3, reps: 15, restSeconds: 45, equipment: "MACHINE" },
  ],
  ABS: [
    { name: "Crunch en máquina", sets: 3, reps: 20, restSeconds: 45, equipment: "MACHINE" },
    { name: "Elevación de piernas colgado", sets: 3, reps: 15, restSeconds: 60, equipment: "BODYWEIGHT" },
    { name: "Plancha abdominal", sets: 3, reps: 30, restSeconds: 45, equipment: "BODYWEIGHT" },
    { name: "Rueda abdominal", sets: 3, reps: 10, restSeconds: 60, equipment: "OTHER" },
    { name: "Crunches en cable", sets: 3, reps: 15, restSeconds: 45, equipment: "CABLE" },
  ],
  FOREARMS: [
    { name: "Curl de muñeca con barra", sets: 3, reps: 15, restSeconds: 45, equipment: "BARBELL" },
    { name: "Curl de muñeca inverso", sets: 3, reps: 15, restSeconds: 45, equipment: "BARBELL" },
  ],
  FULL_BODY: [
    { name: "Press banca con barra", sets: 3, reps: 10, restSeconds: 90, equipment: "BARBELL" },
    { name: "Sentadilla con barra", sets: 3, reps: 10, restSeconds: 120, equipment: "BARBELL" },
    { name: "Dominadas", sets: 3, reps: 8, restSeconds: 90, equipment: "BODYWEIGHT" },
    { name: "Press militar", sets: 3, reps: 10, restSeconds: 90, equipment: "BARBELL" },
    { name: "Peso muerto", sets: 3, reps: 6, restSeconds: 120, equipment: "BARBELL" },
    { name: "Curl con barra", sets: 3, reps: 12, restSeconds: 60, equipment: "BARBELL" },
    { name: "Fondos en paralelas", sets: 3, reps: 10, restSeconds: 75, equipment: "BODYWEIGHT" },
    { name: "Plancha abdominal", sets: 3, reps: 30, restSeconds: 45, equipment: "BODYWEIGHT" },
  ],
  CARDIO: [
    { name: "Saltos de tijera", sets: 3, reps: 30, restSeconds: 30, equipment: "BODYWEIGHT" },
    { name: "Burpees", sets: 3, reps: 15, restSeconds: 45, equipment: "BODYWEIGHT" },
    { name: "Mountain climbers", sets: 3, reps: 20, restSeconds: 30, equipment: "BODYWEIGHT" },
  ],
  TRAPS: [
    { name: "Encogimientos con barra", sets: 3, reps: 12, restSeconds: 60, equipment: "BARBELL" },
    { name: "Remo al mentón", sets: 3, reps: 12, restSeconds: 60, equipment: "BARBELL" },
  ],
}

function getDifficultyMultiplier(level: string): number {
  switch (level) {
    case "BEGINNER": return 0.6
    case "INTERMEDIATE": return 0.8
    case "ADVANCED": return 1.0
    case "ELITE": return 1.2
    default: return 0.8
  }
}

function pickExercisesForMuscleGroup(
  muscleGroups: string[],
  difficultyMultiplier: number,
  usedExercises: Set<string>
): Array<{ name: string; sets: number; reps: number; restSeconds: number; equipment: string }> {
  const selected: Array<{ name: string; sets: number; reps: number; restSeconds: number; equipment: string }> = []

  for (const mg of muscleGroups) {
    const pool = (EXERCISES_BY_MUSCLE[mg] ?? []).filter((e) => !usedExercises.has(e.name))

    const count = mg === "ABS" || mg === "CALVES" || mg === "FOREARMS" ? 1
      : mg === "FULL_BODY" ? Math.ceil(6 * difficultyMultiplier)
      : Math.ceil(3 * difficultyMultiplier)

    const exercises = pool.slice(0, count)
    for (const ex of exercises) {
      selected.push(ex)
      usedExercises.add(ex.name)
    }
  }

  return selected
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

  return getRoutinesResponse(
    (data.objective as string) ?? "UNSURE",
    (data.experienceLevel as string) ?? "BEGINNER",
    data.trainingFrequency as number ?? 3
  )
}

export async function POST(request: Request) {
  try {
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

    const parsed = fitnessCoachSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { objective, experienceLevel, trainingFrequency } = parsed.data

    return getRoutinesResponse(objective, experienceLevel, trainingFrequency)
  } catch (error) {
    console.error("[fitness-coach] POST error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

async function getRoutinesResponse(objective: string, experienceLevel: string, trainingFrequency: number) {
  const superadmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  })

  const difficultyMultiplier = getDifficultyMultiplier(experienceLevel)
  const templates = SPLIT_TEMPLATES[trainingFrequency] ?? SPLIT_TEMPLATES[3]

  const routines = await Promise.all(
    templates.map(async (template) => {
      const usedExercises = new Set<string>()
      const exercises: Array<{
        name: string
        sets: number
        reps: number
        restSeconds: number
        equipment: string
        muscleGroup: string
        order: number
      }> = []

      for (const split of template.muscleGroups) {
        const picked = pickExercisesForMuscleGroup(split, difficultyMultiplier, usedExercises)
        for (const ex of picked) {
          exercises.push({
            ...ex,
            muscleGroup: split[0],
            order: exercises.length,
          })
        }
      }

      const objectiveLabel: Record<string, string> = {
        WEIGHT_LOSS: "Quema de grasa",
        MUSCLE_GAIN: "Ganancia muscular",
        GENERAL_FITNESS: "Acondicionamiento general",
        UNSURE: "Acondicionamiento general",
      }

      const description = `Rutina ${template.name} · ${objectiveLabel[objective] ?? "General"} · ${trainingFrequency} días/semana`
      const localRoutineName = `${template.name} · ${trainingFrequency}d`

      let existing = await prisma.routine.findFirst({
        where: {
          userId: superadmin?.id,
          assignedToId: null,
          name: localRoutineName,
        },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: "asc" },
          },
        },
      })

      if (!existing) {
        existing = await prisma.routine.create({
          data: {
            name: localRoutineName,
            description,
            userId: superadmin?.id ?? "seed",
            exercises: {
              create: await Promise.all(
                exercises.map(async (ex) => {
                  let dbExercise = await prisma.exercise.findFirst({
                    where: { name: ex.name },
                  })

                  if (!dbExercise) {
                    dbExercise = await prisma.exercise.create({
                      data: {
                        name: ex.name,
                        muscleGroup: ex.muscleGroup as MuscleGroup,
                        equipment: ex.equipment as Equipment,
                      },
                    })
                  }

                  return {
                    exerciseId: dbExercise.id,
                    sets: ex.sets,
                    reps: ex.reps,
                    weight: 0,
                    restSeconds: ex.restSeconds,
                    order: ex.order,
                  }
                })
              ),
            },
          },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: "asc" },
            },
          },
        })
      }

      return existing
    })
  )

  const serialize = (r: typeof routines[0]) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    focus: (SPLIT_TEMPLATES[trainingFrequency] ?? SPLIT_TEMPLATES[3]).find((t) => r.name.startsWith(t.name))?.focus ?? "General",
    level: (SPLIT_TEMPLATES[trainingFrequency] ?? SPLIT_TEMPLATES[3]).find((t) => r.name.startsWith(t.name))?.level ?? "INTERMEDIATE",
    splits: (SPLIT_TEMPLATES[trainingFrequency] ?? SPLIT_TEMPLATES[3]).find((t) => r.name.startsWith(t.name))?.muscleGroups.map(
      (mg) => mg.join("+")
    ) ?? [],
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

  return NextResponse.json({ routines: routines.map(serialize) })
}
