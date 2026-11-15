import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"
import { personalizedPlanName } from "@/lib/routine-personalization"

const planInclude = {
  splits: {
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" as const } } },
    orderBy: { order: "asc" as const },
  },
}

// Comprueba la sesión y los permisos, y devuelve el plan de origen y, si el cliente ya
// tiene una copia propia (un plan del coach que solo usa ese cliente), también esa copia.
// No escribe nada: lo comparten la consulta (GET) y la copia (POST).
async function resolvePersonalization(planId: unknown, assignedUserId: unknown) {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user || !["ADMIN", "TRAINER", "SUPER_ADMIN"].includes(user.role)) {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) }
  }

  if (
    !planId ||
    !assignedUserId ||
    typeof planId !== "string" ||
    typeof assignedUserId !== "string"
  ) {
    return {
      error: NextResponse.json({ error: "planId y assignedUserId requeridos" }, { status: 400 }),
    }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: assignedUserId },
    select: { id: true, name: true, gymId: true, assignedTrainerId: true },
  })
  if (!targetUser) {
    return { error: NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 }) }
  }

  if (user.role === "ADMIN") {
    if (!user.gymId || targetUser.gymId !== user.gymId) {
      return { error: NextResponse.json({ error: "Plan no encontrado" }, { status: 404 }) }
    }
  }

  if (user.role === "TRAINER") {
    const clientIds = await getTrainerClientIds(user.id)
    if (!clientIds.includes(assignedUserId)) {
      return {
        error: NextResponse.json(
          { error: "Solo puedes duplicar rutinas para tus clientes" },
          { status: 403 }
        ),
      }
    }
  }

  const sourcePlan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    include: { user: { select: { id: true, role: true, gymId: true } }, ...planInclude },
  })

  if (!sourcePlan) {
    return { error: NextResponse.json({ error: "Plan no encontrado" }, { status: 404 }) }
  }

  if (user.role === "ADMIN" && sourcePlan.user.gymId !== user.gymId) {
    return { error: NextResponse.json({ error: "Plan no encontrado" }, { status: 404 }) }
  }

  if (
    user.role === "TRAINER" &&
    sourcePlan.userId !== user.id &&
    sourcePlan.user.role !== "SUPER_ADMIN"
  ) {
    return { error: NextResponse.json({ error: "Sin permisos sobre este plan" }, { status: 403 }) }
  }

  // Ya es una copia propia si el plan activo del cliente es del coach y nadie más lo usa.
  // Si lo comparten varios clientes, editarlo cambiaría la rutina de todos: se copia.
  let existingPlan = null
  const existingAssignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: assignedUserId, active: true, plan: { userId: user.id } },
    select: { planId: true },
  })
  if (existingAssignment) {
    const sharedWith = await prisma.assignedRoutinePlan.count({
      where: { planId: existingAssignment.planId, active: true, userId: { not: assignedUserId } },
    })
    if (sharedWith === 0) {
      existingPlan = await prisma.routinePlan.findUnique({
        where: { id: existingAssignment.planId },
        include: planInclude,
      })
    }
  }

  return { user, targetUser, sourcePlan, existingPlan }
}

// Consulta para la pantalla «Personalizar»: qué plan se va a editar y si hará falta
// una copia. Abrir la pantalla no cambia nada (#126).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const resolved = await resolvePersonalization(
    searchParams.get("planId"),
    searchParams.get("assignedUserId")
  )
  if (resolved.error) return resolved.error

  const { targetUser, sourcePlan, existingPlan } = resolved
  return NextResponse.json({
    plan: existingPlan ?? sourcePlan,
    needsCopy: !existingPlan,
    clientName: targetUser.name,
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const resolved = await resolvePersonalization(body.planId, body.assignedUserId)
  if (resolved.error) return resolved.error

  const { user, targetUser, sourcePlan, existingPlan } = resolved
  if (existingPlan) {
    return NextResponse.json({ plan: existingPlan, reused: true })
  }

  let planName = personalizedPlanName(sourcePlan.name, targetUser.name)
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = personalizedPlanName(sourcePlan.name, targetUser.name, attempt)
    const collision = await prisma.routinePlan.findUnique({
      where: { name_userId: { name: candidate, userId: user.id } },
      select: { id: true },
    })
    if (!collision) {
      planName = candidate
      break
    }
  }

  const newPlan = await prisma.routinePlan.create({
    data: {
      name: planName,
      description: sourcePlan.description,
      objective: sourcePlan.objective,
      frequency: sourcePlan.frequency,
      difficulty: sourcePlan.difficulty,
      userId: user.id,
      splits: {
        create: sourcePlan.splits.map((split, i) => ({
          label: split.label,
          name: split.name,
          description: split.description,
          muscleGroups: split.muscleGroups,
          estimatedDuration: split.estimatedDuration,
          difficulty: split.difficulty,
          order: i,
          exercises: {
            create: split.exercises.map((ex, j) => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              restSeconds: ex.restSeconds,
              order: j,
              notes: ex.notes,
            })),
          },
        })),
      },
    },
    include: planInclude,
  })

  // El historial del cliente sigue a la copia: sus entrenamientos de cada día del plan
  // original pasan al mismo día de la copia, así no pierde el historial ni vuelve al día A.
  const moveLogs = sourcePlan.splits.flatMap((split, i) => {
    const copy = newPlan.splits[i]
    return copy
      ? [
          prisma.workoutLog.updateMany({
            where: { userId: targetUser.id, splitId: split.id },
            data: { splitId: copy.id },
          }),
        ]
      : []
  })

  await prisma.$transaction([
    prisma.assignedRoutinePlan.updateMany({
      where: { userId: targetUser.id, active: true },
      data: { active: false },
    }),
    prisma.assignedRoutinePlan.create({
      data: { userId: targetUser.id, planId: newPlan.id },
    }),
    ...moveLogs,
  ])

  return NextResponse.json({ plan: newPlan }, { status: 201 })
}
