import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { planId, assignToUserId } = await request.json()
  if (!planId || !assignToUserId) {
    return NextResponse.json({ error: "planId y assignToUserId requeridos" }, { status: 400 })
  }

  if (user.role === "TRAINER") {
    const clientIds = await getTrainerClientIds(user.id)
    if (!clientIds.includes(assignToUserId)) {
      return NextResponse.json(
        { error: "Solo puedes asignar rutinas a tus clientes" },
        { status: 403 }
      )
    }
  }

  const plan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    include: { splits: { include: { exercises: { orderBy: { order: "asc" } } } } },
  })

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }

  // Deactivate old assignments
  await prisma.assignedRoutinePlan.updateMany({
    where: { userId: assignToUserId, active: true },
    data: { active: false },
  })

  // Create new assignment
  const assignment = await prisma.assignedRoutinePlan.create({
    data: {
      userId: assignToUserId,
      planId: plan.id,
    },
    include: {
      plan: {
        include: {
          splits: {
            include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  })

  return NextResponse.json({ assignment }, { status: 201 })
}
