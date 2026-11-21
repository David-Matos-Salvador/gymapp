import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"
import { MuscleGroup, Equipment } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { focusForObjective, generatedPlanName } from "@/lib/generated-routine"

const fitnessCoachSchema = z.object({
  objective: z.enum(["WEIGHT_LOSS", "MUSCLE_GAIN", "GENERAL_FITNESS", "UNSURE"]),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]),
  trainingFrequency: z.number().int().min(3).max(5),
})

const SPLIT_TEMPLATES: Record<
  number,
  { name: string; focus: string; level: string; muscleGroups: string[][] }[]
> = {
  3: [
    {
      name: "Cuerpo completo",
      focus: "Cuerpo completo",
      level: "BEGINNER",
      muscleGroups: [["FULL_BODY"], ["FULL_BODY"], ["FULL_BODY"]],
    },
    {
      name: "Torso / Piernas",
      focus: "Fuerza",
      level: "INTERMEDIATE",
      muscleGroups: [["CHEST", "BACK", "SHOULDERS"], ["LEGS", "GLUTES", "CALVES"], ["FULL_BODY"]],
    },
    {
      name: "Empuje / Tirón / Piernas",
      focus: "Hipertrofia",
      level: "INTERMEDIATE",
      muscleGroups: [
        ["CHEST", "SHOULDERS", "TRICEPS"],
        ["BACK", "BICEPS", "FOREARMS"],
        ["LEGS", "GLUTES", "CALVES"],
      ],
    },
  ],
  4: [
    {
      name: "Base para empezar",
      focus: "Base y técnica",
      level: "BEGINNER",
      muscleGroups: [
        ["CHEST", "SHOULDERS", "TRICEPS"],
        ["LEGS", "GLUTES", "CALVES"],
        ["BACK", "BICEPS"],
        ["FULL_BODY"],
      ],
    },
    {
      name: "Superior / Inferior",
      focus: "Crecimiento muscular",
      level: "INTERMEDIATE",
      muscleGroups: [
        ["CHEST", "SHOULDERS", "TRICEPS"],
        ["BACK", "BICEPS"],
        ["LEGS", "GLUTES"],
        ["FULL_BODY"],
      ],
    },
    {
      name: "Empuje / Tirón / Piernas / Cuerpo completo",
      focus: "Hipertrofia",
      level: "ADVANCED",
      muscleGroups: [
        ["CHEST", "SHOULDERS", "TRICEPS"],
        ["BACK", "BICEPS"],
        ["LEGS", "GLUTES", "CALVES"],
        ["FULL_BODY"],
      ],
    },
    {
      name: "Pecho+Tríceps / Espalda+Bíceps / Piernas / Hombros+Abdomen",
      focus: "Definición",
      level: "INTERMEDIATE",
      muscleGroups: [
        ["CHEST", "TRICEPS"],
        ["BACK", "BICEPS"],
        ["LEGS", "GLUTES", "CALVES"],
        ["SHOULDERS", "ABS"],
      ],
    },
  ],
  5: [
    {
      name: "Base para empezar",
      focus: "Base y técnica",
      level: "BEGINNER",
      muscleGroups: [
        ["CHEST", "TRICEPS"],
        ["LEGS", "GLUTES"],
        ["BACK", "BICEPS"],
        ["SHOULDERS", "ABS"],
        ["FULL_BODY"],
      ],
    },
    {
      name: "Pecho+Tríceps / Espalda+Bíceps / Piernas / Hombros / Cuerpo completo",
      focus: "Rendimiento máximo",
      level: "ADVANCED",
      muscleGroups: [
        ["CHEST", "TRICEPS"],
        ["BACK", "BICEPS"],
        ["LEGS", "GLUTES"],
        ["SHOULDERS"],
        ["FULL_BODY"],
      ],
    },
    {
      name: "Pecho / Espalda / Piernas / Hombros / Brazos",
      focus: "Definición",
      level: "ADVANCED",
      muscleGroups: [
        ["CHEST"],
        ["BACK"],
        ["LEGS", "GLUTES", "CALVES"],
        ["SHOULDERS"],
        ["BICEPS", "TRICEPS"],
      ],
    },
    {
      name: "Hipertrofia Superior / Inferior / Empuje / Tirón / Cuerpo completo",
      focus: "Volumen",
      level: "ELITE",
      muscleGroups: [
        ["CHEST", "SHOULDERS"],
        ["LEGS", "GLUTES"],
        ["CHEST", "TRICEPS"],
        ["BACK", "BICEPS"],
        ["FULL_BODY"],
      ],
    },
  ],
}

const MUSCLE_POOL: Record<
  string,
  Array<{
    name: string
    equipment: string
    sets: number
    reps: string
    restSeconds: number
    isCompound?: boolean
  }>
> = {
  CHEST: [
    {
      name: "Press de banca",
      equipment: "BARBELL",
      sets: 4,
      reps: "8-12",
      restSeconds: 90,
      isCompound: true,
    },
    {
      name: "Press inclinado con mancuernas",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "10-12",
      restSeconds: 75,
    },
    {
      name: "Aperturas con mancuernas",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "12-15",
      restSeconds: 60,
    },
    {
      name: "Fondos en paralelas",
      equipment: "BODYWEIGHT",
      sets: 3,
      reps: "8-12",
      restSeconds: 75,
    },
    { name: "Cruce de cables", equipment: "CABLE", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Press declinado", equipment: "BARBELL", sets: 3, reps: "10-12", restSeconds: 75 },
  ],
  BACK: [
    {
      name: "Dominadas",
      equipment: "BODYWEIGHT",
      sets: 4,
      reps: "8-12",
      restSeconds: 90,
      isCompound: true,
    },
    {
      name: "Remo con barra",
      equipment: "BARBELL",
      sets: 4,
      reps: "8-12",
      restSeconds: 90,
      isCompound: true,
    },
    { name: "Jalón al pecho", equipment: "CABLE", sets: 3, reps: "10-12", restSeconds: 75 },
    {
      name: "Peso muerto",
      equipment: "BARBELL",
      sets: 5,
      reps: "5",
      restSeconds: 180,
      isCompound: true,
    },
    { name: "Remo en máquina", equipment: "MACHINE", sets: 3, reps: "10-12", restSeconds: 75 },
    {
      name: "Pull-over con mancuerna",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "12-15",
      restSeconds: 60,
    },
  ],
  SHOULDERS: [
    {
      name: "Press militar",
      equipment: "BARBELL",
      sets: 4,
      reps: "8-12",
      restSeconds: 90,
      isCompound: true,
    },
    {
      name: "Elevaciones laterales",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "12-15",
      restSeconds: 60,
    },
    {
      name: "Elevaciones frontales",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "12-15",
      restSeconds: 60,
    },
    { name: "Jalón a la cara", equipment: "CABLE", sets: 3, reps: "15-20", restSeconds: 60 },
    {
      name: "Pájaros para deltoides posterior",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "12-15",
      restSeconds: 60,
    },
  ],
  BICEPS: [
    { name: "Curl con barra", equipment: "BARBELL", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Curl martillo", equipment: "DUMBBELL", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Curl concentrado", equipment: "DUMBBELL", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Curl con cable", equipment: "CABLE", sets: 3, reps: "12-15", restSeconds: 60 },
  ],
  TRICEPS: [
    { name: "Press francés", equipment: "EZ_BAR", sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Extensión en polea", equipment: "CABLE", sets: 3, reps: "12-15", restSeconds: 60 },
    { name: "Fondos en banco", equipment: "BODYWEIGHT", sets: 3, reps: "10-15", restSeconds: 75 },
    {
      name: "Press de banca agarre cerrado",
      equipment: "BARBELL",
      sets: 3,
      reps: "8-12",
      restSeconds: 75,
    },
  ],
  LEGS: [
    {
      name: "Sentadilla",
      equipment: "BARBELL",
      sets: 4,
      reps: "8-12",
      restSeconds: 120,
      isCompound: true,
    },
    { name: "Prensa de piernas", equipment: "MACHINE", sets: 3, reps: "10-15", restSeconds: 90 },
    {
      name: "Extensión de cuádriceps",
      equipment: "MACHINE",
      sets: 3,
      reps: "12-15",
      restSeconds: 60,
    },
    { name: "Curl femoral", equipment: "MACHINE", sets: 3, reps: "12-15", restSeconds: 60 },
    {
      name: "Zancadas con mancuernas",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "10-12",
      restSeconds: 75,
    },
  ],
  GLUTES: [
    {
      name: "Empuje de cadera",
      equipment: "BARBELL",
      sets: 4,
      reps: "8-12",
      restSeconds: 90,
      isCompound: true,
    },
    { name: "Peso muerto rumano", equipment: "BARBELL", sets: 3, reps: "10-12", restSeconds: 90 },
    {
      name: "Patada de glúteo en polea",
      equipment: "CABLE",
      sets: 3,
      reps: "12-15",
      restSeconds: 60,
    },
    { name: "Abducción de cadera", equipment: "MACHINE", sets: 3, reps: "15-20", restSeconds: 60 },
  ],
  ABS: [
    { name: "Plancha", equipment: "BODYWEIGHT", sets: 3, reps: "30-60s", restSeconds: 60 },
    {
      name: "Elevaciones de piernas",
      equipment: "BODYWEIGHT",
      sets: 3,
      reps: "15-20",
      restSeconds: 60,
    },
    {
      name: "Abdominales en máquina",
      equipment: "MACHINE",
      sets: 3,
      reps: "15-20",
      restSeconds: 60,
    },
    { name: "Rueda abdominal", equipment: "OTHER", sets: 3, reps: "10-15", restSeconds: 60 },
  ],
  CALVES: [
    { name: "Elevación de talones", equipment: "MACHINE", sets: 4, reps: "15-20", restSeconds: 60 },
    {
      name: "Elevación de gemelos sentado",
      equipment: "MACHINE",
      sets: 3,
      reps: "15-20",
      restSeconds: 60,
    },
  ],
  FOREARMS: [
    { name: "Curl de muñeca", equipment: "BARBELL", sets: 3, reps: "15-20", restSeconds: 45 },
    {
      name: "Curl de muñeca inverso",
      equipment: "BARBELL",
      sets: 3,
      reps: "15-20",
      restSeconds: 45,
    },
  ],
  FULL_BODY: [
    { name: "Burpees", equipment: "BODYWEIGHT", sets: 3, reps: "10-15", restSeconds: 60 },
    {
      name: "Balanceo con pesa rusa",
      equipment: "KETTLEBELL",
      sets: 3,
      reps: "15-20",
      restSeconds: 45,
    },
    {
      name: "Sentadilla con press",
      equipment: "DUMBBELL",
      sets: 3,
      reps: "10-12",
      restSeconds: 75,
    },
    { name: "Cuerdas de batalla", equipment: "OTHER", sets: 3, reps: "30s", restSeconds: 45 },
  ],
  CARDIO: [
    { name: "Burpees", equipment: "BODYWEIGHT", sets: 4, reps: "12-15", restSeconds: 45 },
    { name: "Saltos al cajón", equipment: "OTHER", sets: 3, reps: "10-15", restSeconds: 60 },
    { name: "Escaladores", equipment: "BODYWEIGHT", sets: 3, reps: "20", restSeconds: 45 },
  ],
}

function getDifficultyMultiplier(level: string): number {
  switch (level) {
    case "ELITE":
      return 2.0
    case "ADVANCED":
      return 1.5
    case "INTERMEDIATE":
      return 1.2
    default:
      return 1.0
  }
}

const LEVEL_ORDER = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]

// La plantilla del nivel que la persona declaró sale primera; después, las más cercanas.
function sortTemplatesByLevel<T extends { level: string }>(templates: T[], level: string): T[] {
  const target = LEVEL_ORDER.indexOf(level)
  const distance = (t: T) => Math.abs(LEVEL_ORDER.indexOf(t.level) - target)
  return [...templates].sort((a, b) => distance(a) - distance(b))
}

// Ejercicios que alguien que recién empieza casi nunca puede hacer bien (#128). Las rutinas de
// principiante usan otros del mismo grupo (por ejemplo, jalón al pecho en vez de dominadas).
const NOT_FOR_BEGINNERS = new Set([
  "Dominadas",
  "Fondos en paralelas",
  "Peso muerto",
  "Rueda abdominal",
])

// Un día de cuerpo completo combina piernas, empuje, tirón y core, en vez de tomar solo los
// pocos ejercicios marcados como «Cuerpo completo» (que dejaban días de Burpees y Kettlebell).
const FULL_BODY_PATTERN = ["LEGS", "CHEST", "BACK", "ABS"]

const EXERCISES_PER_DAY = 4

type PoolExercise = (typeof MUSCLE_POOL)[string][number]

function chooseExercises(
  muscleGroups: string[],
  usedNames: Set<string>,
  allowedNames: Set<string> | undefined,
  beginner: boolean
): PoolExercise[] {
  const usable = (group: string) =>
    (MUSCLE_POOL[group] ?? []).filter(
      (ex) =>
        (!allowedNames || allowedNames.has(ex.name)) &&
        !(beginner && NOT_FOR_BEGINNERS.has(ex.name))
    )
  const fresh = (group: string) => usable(group).filter((ex) => !usedNames.has(ex.name))

  const mainGroup = muscleGroups[0]
  let candidates: PoolExercise[]
  if (mainGroup === "FULL_BODY") {
    // Uno de cada patrón, sin repetir entre días mientras se pueda; después, los de cuerpo
    // completo para llegar al mínimo.
    candidates = [
      ...FULL_BODY_PATTERN.flatMap((group) => (fresh(group)[0] ?? usable(group)[0]) || []),
      ...usable("FULL_BODY"),
    ]
  } else {
    // El grupo principal manda; los otros grupos del día completan el mínimo.
    const main = fresh(mainGroup)
    candidates = [
      ...main.slice(0, EXERCISES_PER_DAY - 1),
      ...muscleGroups.slice(1).flatMap((group) => fresh(group)[0] || []),
      ...main.slice(EXERCISES_PER_DAY - 1),
      ...muscleGroups.slice(1).flatMap((group) => fresh(group).slice(1)),
    ]
  }

  const chosen = new Map<string, PoolExercise>()
  for (const ex of candidates) {
    if (chosen.size === EXERCISES_PER_DAY) break
    if (!chosen.has(ex.name)) chosen.set(ex.name, ex)
  }
  return [...chosen.values()]
}

function pickExercisesForMuscleGroup(
  muscleGroups: string[],
  multiplier: number,
  usedNames: Set<string>,
  allowedNames?: Set<string>,
  beginner = false
) {
  const picked: Array<{
    name: string
    sets: number
    reps: string
    restSeconds: number
    equipment: string
    order: number
  }> = []

  const chosen = chooseExercises(muscleGroups, usedNames, allowedNames, beginner)

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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}

async function findExerciseByNameInsensitive(name: string) {
  return prisma.exercise.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  })
}

/**
 * Resolves an Exercise without ever failing on a duplicate name.
 *
 * The seed already owns the canonical spelling and concurrent onboarding
 * requests may race on the same pool exercise. We therefore:
 *  1. look up case-insensitively so the seed row is reused,
 *  2. upsert by exact name as the atomic write,
 *  3. recover from P2002 by re-reading case-insensitively.
 */
async function resolveExercise(
  exercise: { name: string; equipment: string },
  muscleGroup: MuscleGroup,
  userId: string | undefined
): Promise<{ id: string }> {
  const existing = await findExerciseByNameInsensitive(exercise.name)
  if (existing) return existing

  try {
    return await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {},
      create: {
        name: exercise.name,
        muscleGroup:
          exercise.equipment === "BODYWEIGHT" ? ("FULL_BODY" as MuscleGroup) : muscleGroup,
        equipment: exercise.equipment as Equipment,
        userId,
      },
      select: { id: true },
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error

    const raced = await findExerciseByNameInsensitive(exercise.name)
    if (raced) return raced
    throw error
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const rawBody = (await request.json()) as Record<string, unknown>
  const parsed = fitnessCoachSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // En modo asistido, el trainer genera la rutina para su cliente
  let memberId: string | null = null
  if (typeof rawBody.memberId === "string" && rawBody.memberId) {
    if (user.role !== "TRAINER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo entrenadores pueden generar rutinas para un miembro" },
        { status: 403 }
      )
    }
    if (user.role === "TRAINER") {
      const clientIds = await getTrainerClientIds(user.id)
      if (!clientIds.includes(rawBody.memberId)) {
        return NextResponse.json({ error: "El miembro no es tu cliente" }, { status: 403 })
      }
    }
    if (user.role === "ADMIN") {
      const target = await prisma.user.findUnique({
        where: { id: rawBody.memberId },
        select: { gymId: true },
      })
      if (!target || !user.gymId || target.gymId !== user.gymId) {
        return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 })
      }
    }
    memberId = rawBody.memberId
  } else if (user.role !== "MEMBER") {
    return NextResponse.json({ error: "Solo miembros" }, { status: 403 })
  }

  const { objective, experienceLevel, trainingFrequency } = parsed.data

  const superadmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  })

  const targetMember = memberId
    ? await prisma.user.findUnique({ where: { id: memberId }, select: { gymId: true } })
    : user
  const enabledExercises = targetMember?.gymId
    ? await prisma.gymExercise.findMany({
        where: { gymId: targetMember.gymId, active: true },
        select: { exercise: { select: { name: true } } },
      })
    : []
  const allowedNames =
    enabledExercises.length > 0
      ? new Set(enabledExercises.map((item) => item.exercise.name))
      : undefined

  const templates = sortTemplatesByLevel(
    SPLIT_TEMPLATES[trainingFrequency] ?? SPLIT_TEMPLATES[3],
    experienceLevel
  )

  const plans = await Promise.all(
    templates.map(async (template) => {
      const planName = generatedPlanName(template.name, objective, trainingFrequency)
      // Las rutinas se comparten entre personas: la de principiante se arma siempre con volumen
      // de principiante, aunque la genere por primera vez alguien con más experiencia.
      const beginner = template.level === "BEGINNER"
      const difficultyMultiplier = getDifficultyMultiplier(beginner ? "BEGINNER" : experienceLevel)

      const existingPlan = await prisma.routinePlan.findFirst({
        where: { userId: superadmin?.id, name: planName },
        include: {
          splits: {
            include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      })

      if (existingPlan) {
        // Rutinas guardadas antes de #128: se rehacen solo las divisiones cortas y, en las de
        // principiante, las que piden ejercicios que no son para quien empieza (sin borrar el
        // plan, para no perder asignaciones ni historial).
        const needsRedo = (s: (typeof existingPlan.splits)[number]) =>
          s.exercises.length < EXERCISES_PER_DAY ||
          (beginner && s.exercises.some((e) => NOT_FOR_BEGINNERS.has(e.exercise?.name ?? "")))
        const shortSplits = existingPlan.splits.filter(needsRedo)
        if (shortSplits.length === 0) return existingPlan

        const usedExercises = new Set<string>(
          existingPlan.splits
            .filter((s) => !needsRedo(s))
            .flatMap((s) => s.exercises.map((e) => e.exercise?.name ?? ""))
        )
        for (const split of shortSplits) {
          const picked = pickExercisesForMuscleGroup(
            split.muscleGroups,
            difficultyMultiplier,
            usedExercises,
            allowedNames,
            beginner
          )
          const create = await Promise.all(
            picked.map(async (ex, exIdx) => {
              const dbExercise = await resolveExercise(
                ex,
                split.muscleGroups[0] as MuscleGroup,
                superadmin?.id
              )
              return {
                exerciseId: dbExercise.id,
                sets: ex.sets as number,
                reps: String(ex.reps),
                weight: 0,
                restSeconds: ex.restSeconds,
                order: exIdx,
              }
            })
          )
          await prisma.routineSplit.update({
            where: { id: split.id },
            data: { exercises: { deleteMany: {}, create } },
          })
        }

        return prisma.routinePlan.findUniqueOrThrow({
          where: { id: existingPlan.id },
          include: {
            splits: {
              include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
              orderBy: { order: "asc" },
            },
          },
        })
      }

      const usedExercises = new Set<string>()
      const splitData = template.muscleGroups.map((mg, i) => ({
        label: String.fromCharCode(65 + i),
        name: `${template.name} - ${String.fromCharCode(65 + i)}`,
        muscleGroups: mg,
        estimatedDuration: Math.round(mg.reduce((sum) => sum + 45 * difficultyMultiplier, 30)),
        order: i,
        exercises: pickExercisesForMuscleGroup(
          mg,
          difficultyMultiplier,
          usedExercises,
          allowedNames,
          beginner
        ),
      }))

      return prisma.routinePlan.create({
        data: {
          userId: superadmin?.id ?? "seed",
          name: planName,
          // Sin descripción: solo repetía el nombre (#188).
          description: null,
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
                      const dbExercise = await resolveExercise(
                        ex,
                        split.muscleGroups[0] as MuscleGroup,
                        superadmin?.id
                      )
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
        include: {
          splits: {
            include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      })
    })
  )

  const serializePlan = (p: (typeof plans)[0]) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    focus: focusForObjective(templateForName(p.name)?.focus, p.objective),
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

  const assignedPlans = await prisma.assignedRoutinePlan.findMany({
    where: { userId: memberId ?? user.id, active: true },
    include: {
      plan: {
        include: {
          splits: {
            include: { exercises: { include: { exercise: true } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  })

  const coachPlans = assignedPlans.map(({ plan }) => {
    return serializePlan(plan as unknown as (typeof plans)[0])
  })

  const seenIds = new Set<string>()
  const allPlans = [...coachPlans, ...plans.map(serializePlan)].filter((p) => {
    if (seenIds.has(p.id)) return false
    seenIds.add(p.id)
    return true
  })

  return NextResponse.json({ plans: allPlans })
}
