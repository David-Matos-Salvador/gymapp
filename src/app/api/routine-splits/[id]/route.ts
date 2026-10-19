import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canReadPlan } from "@/lib/routine-access"
import { getDefaultGym, getEffectiveGym } from "@/lib/effective-gym"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateSplitSchema = z.object({
  label: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  muscleGroups: z.array(z.string()).optional(),
  estimatedDuration: z.number().int().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  order: z.number().int().optional(),
})

async function canEditSplit(splitId: string, user: { id: string; role: string }) {
  const split = await prisma.routineSplit.findUnique({
    where: { id: splitId },
    select: { plan: { select: { userId: true } } },
  })
  if (!split) return false
  return split.plan.userId === user.id || user.role === "SUPER_ADMIN"
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!currentUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params

  const split = await prisma.routineSplit.findUnique({
    where: { id },
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

  if (!split || !(await canReadPlan(split.planId, currentUser))) {
    return NextResponse.json({ error: "Split no encontrado" }, { status: 404 })
  }

  const user = currentUser

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
  const lastPerformance: Record<string, { weight: number; reps: number }> = {}
  for (const set of lastLog?.sets ?? []) {
    const current = lastPerformance[set.exerciseId]
    if (!current || set.weight > current.weight) {
      lastPerformance[set.exerciseId] = { weight: set.weight, reps: set.reps }
    }
  }

  return NextResponse.json({ split, gym, lastPerformance })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { id } = await params

    if (!(await canEditSplit(id, user))) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar este split" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateSplitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updated = await prisma.routineSplit.update({
      where: { id },
      data: parsed.data,
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
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    return NextResponse.json({ split: updated })
  } catch (error) {
    console.error("PATCH /api/routine-splits/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { id } = await params

    if (!(await canEditSplit(id, user))) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este split" },
        { status: 403 }
      )
    }

    await prisma.routineSplit.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/routine-splits/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
