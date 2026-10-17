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
    select: { id: true, role: true },
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
    if (caller.role !== "TRAINER" && caller.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    if (caller.role === "TRAINER") {
      const clientIds = await getTrainerClientIds(caller.id)
      if (!clientIds.includes(body.memberId)) {
        return NextResponse.json({ error: "El miembro no es tu cliente" }, { status: 403 })
      }
    }
    targetUserId = body.memberId
  } else if (caller.role !== "MEMBER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const plan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    include: { splits: { include: { exercises: true }, orderBy: { order: "asc" } } },
  })

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }

  // Deactivate previous assignments
  await prisma.assignedRoutinePlan.updateMany({
    where: { userId: targetUserId, active: true },
    data: { active: false },
  })

  // Create new assignment
  await prisma.assignedRoutinePlan.create({
    data: { userId: targetUserId, planId: plan.id },
  })

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
