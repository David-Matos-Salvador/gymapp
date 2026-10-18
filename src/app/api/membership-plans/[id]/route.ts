import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin } from "@/lib/authz"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updatePlanSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  currency: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  active: z.boolean().optional(),
})

async function getActor() {
  const session = await auth()
  if (!session?.user?.email) return null
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
}

function canManagePlan(
  user: { role: string; gymId: string | null },
  plan: { gymId: string }
): boolean {
  if (isSuperAdmin(user.role)) return true
  return user.role === "ADMIN" && user.gymId === plan.gymId
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getActor()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (user.role === "TRAINER" || user.role === "MEMBER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updatePlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.membershipPlan.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }
  if (!canManagePlan(user, existing)) {
    return NextResponse.json({ error: "Sin permisos sobre este plan" }, { status: 403 })
  }

  const plan = await prisma.membershipPlan.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ plan })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getActor()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (user.role === "TRAINER" || user.role === "MEMBER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.membershipPlan.findUnique({
    where: { id },
    select: { id: true, gymId: true, _count: { select: { memberships: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }
  if (!canManagePlan(user, existing)) {
    return NextResponse.json({ error: "Sin permisos sobre este plan" }, { status: 403 })
  }
  if (existing._count.memberships > 0) {
    return NextResponse.json(
      {
        error: "No se puede eliminar un plan con membresías asociadas. Desactivalo en su lugar.",
      },
      { status: 409 }
    )
  }

  await prisma.membershipPlan.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
