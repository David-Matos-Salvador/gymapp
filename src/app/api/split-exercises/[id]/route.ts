import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateSplitExerciseSchema = z.object({
  sets: z.number().int().optional(),
  reps: z.string().optional(),
  weight: z.number().optional(),
  restSeconds: z.number().int().optional(),
  order: z.number().int().optional(),
  notes: z.string().nullable().optional(),
})

async function canEditSplitExercise(seId: string, user: { id: string; role: string }) {
  const se = await prisma.routineSplitExercise.findUnique({
    where: { id: seId },
    select: { split: { select: { plan: { select: { userId: true } } } } },
  })
  if (!se) return false
  return se.split.plan.userId === user.id || user.role === "SUPER_ADMIN"
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

    if (!(await canEditSplitExercise(id, user))) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar este ejercicio" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateSplitExerciseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updated = await prisma.routineSplitExercise.update({
      where: { id },
      data: parsed.data,
      include: { exercise: true },
    })

    return NextResponse.json({ splitExercise: updated })
  } catch (error) {
    console.error("PATCH /api/split-exercises/[id]:", error)
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

    if (!(await canEditSplitExercise(id, user))) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este ejercicio" },
        { status: 403 }
      )
    }

    await prisma.routineSplitExercise.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/split-exercises/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
