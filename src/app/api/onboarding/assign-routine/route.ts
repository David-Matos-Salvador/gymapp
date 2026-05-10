import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

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
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { planId } = await request.json() as { planId: string }
  if (!planId) {
    return NextResponse.json({ error: "planId requerido" }, { status: 400 })
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
    where: { userId: user.id, active: true },
    data: { active: false },
  })

  // Create new assignment
  await prisma.assignedRoutinePlan.create({
    data: { userId: user.id, planId: plan.id },
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
