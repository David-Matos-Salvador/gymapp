import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSplitSchema = z.object({
  planId: z.string().min(1),
  label: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  muscleGroups: z.array(z.string()).default([]),
  estimatedDuration: z.number().int().optional(),
  difficulty: z.string().optional(),
  order: z.number().int().default(0),
})

async function canEditPlan(planId: string, user: { id: string; role: string }) {
  const plan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  })
  if (!plan) return false
  return plan.userId === user.id || user.role === "SUPER_ADMIN"
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createSplitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    if (!(await canEditPlan(parsed.data.planId, user))) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar esta rutina" },
        { status: 403 }
      )
    }

    const split = await prisma.routineSplit.create({
      data: {
        planId: parsed.data.planId,
        label: parsed.data.label,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        muscleGroups: parsed.data.muscleGroups,
        estimatedDuration: parsed.data.estimatedDuration ?? null,
        difficulty: parsed.data.difficulty ?? null,
        order: parsed.data.order,
      },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
      },
    })

    return NextResponse.json({ split }, { status: 201 })
  } catch (error) {
    console.error("POST /api/routine-splits:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
