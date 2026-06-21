import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

async function canEditPlan(planId: string, user: { id: string; role: string }) {
  const plan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  })
  if (!plan) return false
  return plan.userId === user.id || user.role === "SUPER_ADMIN"
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const plan = await prisma.routinePlan.findUnique({
    where: { id },
    include: {
      splits: {
        include: { exercises: { include: { exercise: { include: { creator: { select: { id: true, name: true, role: true } } } } }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  if (!plan) {
    return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ plan })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params

  if (!(await canEditPlan(id, user))) {
    return NextResponse.json({ error: "No tienes permisos para modificar esta rutina" }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, objective, frequency, difficulty } = body

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (objective !== undefined) updateData.objective = objective
  if (frequency !== undefined) updateData.frequency = frequency
  if (difficulty !== undefined) updateData.difficulty = difficulty

  const plan = await prisma.routinePlan.update({
    where: { id },
    data: updateData,
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  })

  return NextResponse.json({ plan })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params

  if (!(await canEditPlan(id, user))) {
    return NextResponse.json({ error: "No tienes permisos para eliminar esta rutina" }, { status: 403 })
  }

  await prisma.routinePlan.delete({ where: { id } })

  return NextResponse.json({ success: true })
}