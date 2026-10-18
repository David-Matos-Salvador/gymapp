import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user || !["ADMIN", "TRAINER", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { planId, assignedUserId } = await request.json()
  if (!planId || !assignedUserId) {
    return NextResponse.json({ error: "planId y assignedUserId requeridos" }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: assignedUserId },
    select: { id: true, gymId: true, assignedTrainerId: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.role === "ADMIN") {
    if (!user.gymId || targetUser.gymId !== user.gymId) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
    }
  }

  if (user.role === "TRAINER") {
    const clientIds = await getTrainerClientIds(user.id)
    if (!clientIds.includes(assignedUserId)) {
      return NextResponse.json(
        { error: "Solo puedes duplicar rutinas para tus clientes" },
        { status: 403 }
      )
    }
  }

  const sourcePlan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    include: {
      user: { select: { id: true, role: true, gymId: true } },
      splits: {
        include: { exercises: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!sourcePlan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }

  if (user.role === "ADMIN" && sourcePlan.user.gymId !== user.gymId) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }

  if (
    user.role === "TRAINER" &&
    sourcePlan.userId !== user.id &&
    sourcePlan.user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "Sin permisos sobre este plan" }, { status: 403 })
  }

  const newPlan = await prisma.routinePlan.create({
    data: {
      name: sourcePlan.name,
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
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  })

  await prisma.assignedRoutinePlan.updateMany({
    where: { userId: assignedUserId, active: true },
    data: { active: false },
  })

  await prisma.assignedRoutinePlan.create({
    data: {
      userId: assignedUserId,
      planId: newPlan.id,
    },
  })

  return NextResponse.json({ plan: newPlan }, { status: 201 })
}
