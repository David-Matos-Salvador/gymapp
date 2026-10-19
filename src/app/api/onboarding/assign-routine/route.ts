import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const caller = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })

  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = (await request.json()) as { planId: string; memberId?: string }
  const { planId } = body
  if (!planId) {
    return NextResponse.json({ error: "planId requerido" }, { status: 400 })
  }

  let targetUserId = caller.id
  if (body.memberId) {
    if (!["TRAINER", "ADMIN", "SUPER_ADMIN"].includes(caller.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    if (caller.role === "TRAINER") {
      const clientIds = await getTrainerClientIds(caller.id)
      if (!clientIds.includes(body.memberId)) {
        return NextResponse.json({ error: "El miembro no es tu cliente" }, { status: 403 })
      }
    }
    if (caller.role === "ADMIN") {
      const target = await prisma.user.findUnique({
        where: { id: body.memberId },
        select: { gymId: true },
      })
      if (!target || !caller.gymId || target.gymId !== caller.gymId) {
        return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 })
      }
    }
    targetUserId = body.memberId
  } else if (caller.role !== "MEMBER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const plan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    include: {
      user: { select: { id: true, role: true, gymId: true } },
      splits: { include: { exercises: true }, orderBy: { order: "asc" } },
    },
  })

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }

  if (caller.role === "ADMIN") {
    if (plan.user.gymId !== caller.gymId && plan.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
    }
  }

  if (caller.role === "TRAINER") {
    if (plan.userId !== caller.id && plan.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos sobre este plan" }, { status: 403 })
    }
  }

  if (caller.role === "MEMBER") {
    if (plan.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Plan no disponible" }, { status: 403 })
    }
    if (caller.gymId && plan.splits.length > 0) {
      const exerciseIds = [
        ...new Set(plan.splits.flatMap((s) => s.exercises.map((e) => e.exerciseId))),
      ]
      if (exerciseIds.length > 0) {
        const active = await prisma.gymExercise.count({
          where: { gymId: caller.gymId, active: true, exerciseId: { in: exerciseIds } },
        })
        if (active !== exerciseIds.length) {
          return NextResponse.json(
            { error: "Este plan incluye ejercicios no disponibles en tu gimnasio" },
            { status: 409 }
          )
        }
      }
    }
  }

  await prisma.$transaction([
    prisma.assignedRoutinePlan.updateMany({
      where: { userId: targetUserId, active: true, planId: { not: plan.id } },
      data: { active: false },
    }),
    prisma.assignedRoutinePlan.upsert({
      where: { userId_planId: { userId: targetUserId, planId: plan.id } },
      update: { active: true, startedAt: new Date() },
      create: { userId: targetUserId, planId: plan.id },
    }),
  ])

  const serialize = {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    splits: plan.splits.map((s) => ({
      id: s.id,
      label: s.label,
      name: s.name,
      muscleGroups: s.muscleGroups,
      exercises: s.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        restSeconds: e.restSeconds,
        order: e.order,
      })),
    })),
  }

  return NextResponse.json({ plan: serialize })
}
