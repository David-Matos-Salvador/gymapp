import { prisma } from "@/lib/prisma"
import { canReadPlan } from "@/lib/routine-access"
import { getDefaultGym, getEffectiveGym } from "@/lib/effective-gym"

interface SplitUser {
  id: string
  role: string
  gymId: string | null
}

/**
 * Datos de la pantalla de entrenar: el split con sus ejercicios (solo los activos en el
 * gimnasio del usuario, con las máquinas de ese gimnasio), el gimnasio y las series del último
 * entrenamiento. Devuelve `null` si el split no existe o el usuario no puede verlo.
 *
 * La usan la página `/my-routine/[planId]/workout/[splitId]` (para llegar con los datos desde
 * el servidor) y `GET /api/routine-splits/[id]`.
 */
export async function getSplitForWorkout(splitId: string, user: SplitUser) {
  const split = await prisma.routineSplit.findUnique({
    where: { id: splitId },
    include: {
      exercises: {
        include: {
          exercise: {
            include: {
              gymEquipments: {
                select: {
                  id: true,
                  name: true,
                  machineNumber: true,
                  location: true,
                  gymId: true,
                  imageUrl: true,
                  activations: {
                    select: {
                      gymId: true,
                      machineNumber: true,
                      imageUrl: true,
                      active: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      plan: { select: { id: true, name: true } },
    },
  })

  if (!split || !(await canReadPlan(split.planId, user))) return null

  const effectiveGym = await getEffectiveGym(user)
  const defaultGym = await getDefaultGym()
  const primaryGymId = user.gymId

  let activeExerciseIds = new Set<string>()
  if (primaryGymId) {
    const gymExercises = await prisma.gymExercise.findMany({
      where: { gymId: primaryGymId, active: true },
      select: { exerciseId: true },
    })
    activeExerciseIds = new Set(gymExercises.map((e) => e.exerciseId))
  }
  if (!primaryGymId && activeExerciseIds.size === 0 && defaultGym) {
    const defaultExercises = await prisma.gymExercise.findMany({
      where: { gymId: defaultGym.id, active: true },
      select: { exerciseId: true },
    })
    activeExerciseIds = new Set(defaultExercises.map((e) => e.exerciseId))
  }

  if (activeExerciseIds.size > 0) {
    split.exercises = split.exercises.filter((se) => activeExerciseIds.has(se.exerciseId))
  }

  const fallbackGym = primaryGymId ? null : defaultGym

  for (const se of split.exercises) {
    const equip = se.exercise.gymEquipments ?? []
    se.exercise.gymEquipments = equip
      .filter((equipment) => {
        if (primaryGymId && equipment.gymId === primaryGymId) return true
        if (equipment.gymId !== null) return false
        return equipment.activations.some(
          (activation) =>
            activation.active &&
            (activation.gymId === primaryGymId || activation.gymId === fallbackGym?.id)
        )
      })
      .map((equipment) => {
        const { activations, ...rest } = equipment
        const primaryActivation = activations.find(
          (activation) => activation.active && activation.gymId === primaryGymId
        )
        const defaultActivation = activations.find(
          (activation) => activation.active && activation.gymId === fallbackGym?.id
        )
        const activation = primaryActivation ?? defaultActivation
        return {
          ...rest,
          activations: [],
          machineNumber: activation?.machineNumber ?? equipment.machineNumber,
          imageUrl: activation?.imageUrl ?? equipment.imageUrl,
        }
      })
  }

  const gym = effectiveGym
    ? { id: effectiveGym.id, showMachineNumbers: effectiveGym.showMachineNumbers }
    : null

  const lastLog = await prisma.workoutLog.findFirst({
    where: { userId: user.id, splitId: split.id },
    orderBy: { date: "desc" },
    include: { sets: true },
  })
  const lastPerformance: Record<string, Array<{ weight: number; reps: number }>> = {}
  for (const set of lastLog?.sets ?? []) {
    const list = lastPerformance[set.exerciseId] ?? []
    list[set.setNumber - 1] = { weight: set.weight, reps: set.reps }
    lastPerformance[set.exerciseId] = list
  }

  return { split, gym, lastPerformance }
}

export type WorkoutSplitData = NonNullable<Awaited<ReturnType<typeof getSplitForWorkout>>>
