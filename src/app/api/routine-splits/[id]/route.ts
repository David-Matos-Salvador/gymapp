import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canReadPlan } from "@/lib/routine-access"
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

  let activeExerciseIds: Set<string> | null = null
  if (user?.gymId) {
    const gymExercises = await prisma.gymExercise.findMany({
      where: { gymId: user.gymId, active: true },
      select: { exerciseId: true },
    })
    activeExerciseIds = new Set(gymExercises.map((e) => e.exerciseId))
  }

  if (activeExerciseIds) {
    split.exercises = split.exercises.filter((se) => activeExerciseIds!.has(se.exerciseId))
  }

  // Filter gymEquipments: show system equipment (gymId=null) only if activated for user's gym,
  // plus custom equipment for user's gym (gymId matches)
  let activeEquipmentIds: Set<string> | null = null
  if (user?.gymId) {
    const eqActivations = await prisma.gymEquipmentActivation.findMany({
      where: { gymId: user.gymId, active: true },
      select: { equipmentId: true },
    })
    activeEquipmentIds = new Set(eqActivations.map((e) => e.equipmentId))
  }

  if (activeEquipmentIds) {
    for (const se of split.exercises) {
      const equip = se.exercise.gymEquipments ?? []
      se.exercise.gymEquipments = equip
        .filter(
          (e) => e.gymId === user!.gymId || (e.gymId === null && activeEquipmentIds!.has(e.id))
        )
        .map((e) => {
          const { activations, ...equipment } = e
          const activation = activations.find((a) => a.gymId === user!.gymId)
          return {
            ...equipment,
            activations: [],
            machineNumber: activation?.machineNumber ?? e.machineNumber,
            imageUrl: activation?.imageUrl ?? e.imageUrl,
          }
        })
    }
  }

  const gym = user?.gymId
    ? await prisma.gym.findUnique({
        where: { id: user.gymId },
        select: { id: true, showMachineNumbers: true },
      })
    : null

  return NextResponse.json({ split, gym })
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
