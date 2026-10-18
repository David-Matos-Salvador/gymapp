import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(_request: Request, { params }: RouteParams) {
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

  const { id } = await params

  const assignment = await prisma.assignedRoutinePlan.findUnique({
    where: { id },
    include: {
      user: { select: { gymId: true, assignedTrainerId: true } },
      plan: { select: { user: { select: { gymId: true } } } },
    },
  })
  if (!assignment) {
    return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
  }

  if (user.role === "ADMIN") {
    if (
      !user.gymId ||
      assignment.user.gymId !== user.gymId ||
      assignment.plan.user.gymId !== user.gymId
    ) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }
  }

  if (user.role === "TRAINER") {
    const clientIds = await getTrainerClientIds(user.id)
    if (!clientIds.includes(assignment.userId)) {
      return NextResponse.json({ error: "Sin permisos sobre esta asignación" }, { status: 403 })
    }
  }

  await prisma.assignedRoutinePlan.update({
    where: { id },
    data: { active: false },
  })

  return NextResponse.json({ success: true })
}
