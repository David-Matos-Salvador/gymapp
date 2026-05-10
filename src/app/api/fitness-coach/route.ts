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
    { name: "Full Body", focus: "Cuerpo completo", level: "BEGINNER", muscleGroups: [["FULL_BODY"], ["FULL_BODY"], ["FULL_BODY"]] },
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

const MUSCLE_POOL: Record<string, Array<{ name: string; equipment: string; sets: number; reps: string; restSeconds: number; isCompound?: boolean }>> = {
  CHEST: [
    { name: "Press de banca", equipment: "BARBELL", sets: 4, reps: "8-12", restSeconds: 90, isCompound: true },
    { name: "Press inclinado con mancuernas", equipment: "DUMBBELL", sets: 3, reps: "10-12", restSeconds: 75 },
    { name: "Aperturas con mancuernas", equipment: "DUMBBELL", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Fondos en paralelas", equipment: "BODYWEIGHT", sets: 3, reps: "8-12", restSeconds: 75 },
    { name: "Cruce de cables", equipment: "CABLE", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Press declinado", equipment: "BARBELL", sets: 3, reps: "10-12", restSeconds: 75 },
  ],
  BACK: [
    { name: "Dominadas", equipment: "BODYWEIGHT", sets: 4, reps: "8-12", restSeconds: 90, isCompound: true },
    { name: "Remo con barra", equipment: "BARBELL", sets: 4, reps: "8-12", restSeconds: 90, isCompound: true },
    { name: "Jalón al pecho", equipment: "CABLE", sets: 3, reps: "10-12", restSeconds: 75 },
    { name: "Peso muerto", equipment: "BARBELL", sets: 5, reps: "5", restSeconds: 180, isCompound: true },
    { name: "Remo en máquina", equipment: "MACHINE", sets: 3, reps: "10-12", restSeconds: 75 },
    { name: "Pull-over con mancuerna", equipment: "DUMBBELL", sets: 3, reps: "12-15", restSeconds: 60 },
  ],
  SHOULDERS: [
    { name: "Press militar", equipment: "BARBELL", sets: 4, reps: "8-12", restSeconds: 90, isCompound: true },
    { name: "Elevaciones laterales", equipment: "DUMBBELL", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Elevaciones frontales", equipment: "DUMBBELL", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Face pull", equipment: "CABLE", sets: 3, reps: "15-20", restSeconds: 60 },
    { name: "Pájaros para deltoides posterior", equipment: "DUMBBELL", sets: 3, reps: "12-15", restSeconds: 60 },
  ],
  BICEPS: [
    { name: "Curl con barra", equipment: "BARBELL", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Curl martillo", equipment: "DUMBBELL", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Curl concentrado", equipment: "DUMBBELL", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Curl en polea", equipment: "CABLE", sets: 3, reps: "12-15", restSeconds: 60 },
  ],
  TRICEPS: [
    { name: "Press francés", equipment: "EZ_BAR", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Extensión en polea", equipment: "CABLE", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Fondos en banco", equipment: "BODYWEIGHT", sets: 3, reps: "10-15", restSeconds: 75 },
    { name: "Press cerrado", equipment: "BARBELL", sets: 3, reps: "8-12", restSeconds: 75 },
  ],
  LEGS: [
    { name: "Sentadilla", equipment: "BARBELL", sets: 4, reps: "8-12", restSeconds: 120, isCompound: true },
    { name: "Prensa de piernas", equipment: "MACHINE", sets: 3, reps: "10-15", restSeconds: 90 },
    { name: "Extensión de cuádriceps", equipment: "MACHINE", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Curl femoral", equipment: "MACHINE", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Zancadas con mancuernas", equipment: "DUMBBELL", sets: 3, reps: "10-12", restSeconds: 75 },
  ],
  GLUTES: [
    { name: "Hip thrust", equipment: "BARBELL", sets: 4, reps: "8-12", restSeconds: 90, isCompound: true },
    { name: "Peso muerto rumano", equipment: "BARBELL", sets: 3, reps: "10-12", restSeconds: 90 },
    { name: "Patada de glúteo en polea", equipment: "CABLE", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Abducción de cadera", equipment: "MACHINE", sets: 3, reps: "15-20", restSeconds: 60 },
  ],
  ABS: [
    { name: "Plancha", equipment: "BODYWEIGHT", sets: 3, reps: "30-60s", restSeconds: 60 },
    { name: "Elevaciones de piernas", equipment: "BODYWEIGHT", sets: 3, reps: "15-20", restSeconds: 60 },
    { name: "Crunches en máquina", equipment: "MACHINE", sets: 3, reps: "15-20", restSeconds: 60 },
    { name: "Rueda abdominal", equipment: "OTHER", sets: 3, reps: "10-15", restSeconds: 60 },
  ],
  CALVES: [
    { name: "Elevación de talones", equipment: "MACHINE", sets: 4, reps: "15-20", restSeconds: 60 },
    { name: "Elevación de talones sentado", equipment: "MACHINE", sets: 3, reps: "15-20", restSeconds: 60 },
  ],
  FOREARMS: [
    { name: "Curl de muñeca", equipment: "BARBELL", sets: 3, reps: "15-20", restSeconds: 45 },
    { name: "Curl de muñeca inverso", equipment: "BARBELL", sets: 3, reps: "15-20", restSeconds: 45 },
  ],
  FULL_BODY: [
    { name: "Burpees", equipment: "BODYWEIGHT", sets: 3, reps: "10-15", restSeconds: 60 },
    { name: "Kettlebell swing", equipment: "KETTLEBELL", sets: 3, reps: "15-20", restSeconds: 45 },
    { name: "Thrusters", equipment: "DUMBBELL", sets: 3, reps: "10-12", restSeconds: 75 },
    { name: "Battle ropes", equipment: "OTHER", sets: 3, reps: "30s", restSeconds: 45 },
  ],
  CARDIO: [
    { name: "Burpees", equipment: "BODYWEIGHT", sets: 4, reps: "12-15", restSeconds: 45 },
    { name: "Saltos al cajón", equipment: "OTHER", sets: 3, reps: "10-15", restSeconds: 60 },
    { name: "Mountain climbers", equipment: "BODYWEIGHT", sets: 3, reps: "20", restSeconds: 45 },
  ],
}

function getDifficultyMultiplier(level: string): number {
  switch (level) {
    case "ELITE": return 2.0
    case "ADVANCED": return 1.5
    case "INTERMEDIATE": return 1.2
    default: return 1.0
  }
}

function pickExercisesForMuscleGroup(
  muscleGroups: string[],
  multiplier: number,
  usedNames: Set<string>
) {
  const picked: Array<{
    name: string
    sets: number
    reps: string
    restSeconds: number
    equipment: string
    order: number
  }> = []
  const mainGroup = muscleGroups[0]

  const pool = MUSCLE_POOL[mainGroup] ?? MUSCLE_POOL.FULL_BODY
  const available = pool.filter((ex) => !usedNames.has(ex.name)).slice(0, 4)

  const count = Math.min(available.length, Math.max(2, Math.floor(3 * multiplier)))
  const chosen = available.slice(0, count)

  for (const ex of chosen) {
    usedNames.add(ex.name)
    picked.push({
      name: ex.name,
      sets: Math.max(3, Math.round(ex.sets * multiplier)),
      reps: ex.reps,
      restSeconds: ex.restSeconds,
      equipment: ex.equipment,
      order: picked.length,
    })
  }

  return picked
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user || user.role !== "MEMBER") {
    return NextResponse.json({ error: "Solo miembros" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = fitnessCoachSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { objective, experienceLevel, trainingFrequency } = parsed.data

  const superadmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  })

  const difficultyMultiplier = getDifficultyMultiplier(experienceLevel)
  const templates = SPLIT_TEMPLATES[trainingFrequency] ?? SPLIT_TEMPLATES[3]

  const objectiveLabels: Record<string, string> = {
    WEIGHT_LOSS: "Quema de grasa",
    MUSCLE_GAIN: "Ganancia muscular",
    GENERAL_FITNESS: "Acondicionamiento general",
    UNSURE: "Acondicionamiento general",
  }

  const plans = await Promise.all(
    templates.map(async (template) => {
      const planName = `${template.name} · ${objectiveLabels[objective] ?? "General"} · ${trainingFrequency}d`
      const description = `Rutina ${template.name}. ${objectiveLabels[objective] ?? "General"}. ${trainingFrequency} días por semana.`

      const existingPlan = await prisma.routinePlan.findFirst({
        where: { userId: superadmin?.id, name: planName },
        include: { splits: { include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
      })

      if (existingPlan) return existingPlan

      const usedExercises = new Set<string>()
      const splitData = template.muscleGroups.map((mg, i) => ({
        label: String.fromCharCode(65 + i),
        name: `${template.name} - ${String.fromCharCode(65 + i)}`,
        muscleGroups: mg,
        estimatedDuration: Math.round(mg.reduce((sum) => sum + 45 * difficultyMultiplier, 30)),
        order: i,
        exercises: pickExercisesForMuscleGroup(mg, difficultyMultiplier, usedExercises),
      }))

      return prisma.routinePlan.create({
        data: {
          userId: superadmin?.id ?? "seed",
          name: planName,
          description,
          objective: objective === "UNSURE" ? "GENERAL_FITNESS" : objective,
          frequency: trainingFrequency,
          difficulty: template.level,
          splits: {
            create: await Promise.all(
              splitData.map(async (split, splitIdx) => ({
                label: split.label,
                name: split.name,
                muscleGroups: split.muscleGroups,
                estimatedDuration: split.estimatedDuration,
                order: splitIdx,
                exercises: {
                  create: await Promise.all(
                    split.exercises.map(async (ex, exIdx) => {
                      let dbExercise = await prisma.exercise.findFirst({ where: { name: ex.name } })
                      if (!dbExercise) {
                        dbExercise = await prisma.exercise.create({
                          data: {
                            name: ex.name,
                            muscleGroup: ex.equipment === "BODYWEIGHT" ? "FULL_BODY" as MuscleGroup : split.muscleGroups[0] as MuscleGroup,
                            equipment: ex.equipment as Equipment,
                          },
                        })
                      }
                      return {
                        exerciseId: dbExercise.id,
                        sets: ex.sets as number,
                        reps: String(ex.reps),
                        weight: 0,
                        restSeconds: ex.restSeconds,
                        order: exIdx,
                      }
                    })
                  ),
                },
              }))
            ),
          },
        },
        include: { splits: { include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
      })
    })
  )

  const serializePlan = (p: typeof plans[0]) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    focus: templateForName(p.name)?.focus ?? "General",
    difficulty: p.difficulty ?? templateForName(p.name)?.level ?? "INTERMEDIATE",
    frequency: p.frequency ?? trainingFrequency,
    objective: p.objective ?? "GENERAL_FITNESS",
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
        order: e.order,
      })),
    })),
  })

  function templateForName(name: string) {
    return templates.find((t) => name.startsWith(t.name))
  }

  return NextResponse.json({ plans: plans.map(serializePlan) })
}
