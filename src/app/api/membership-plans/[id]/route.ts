import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin } from "@/lib/authz"
import { planCurrencySchema, planDurationSchema, planPriceSchema } from "@/lib/membership-pricing"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: planPriceSchema.optional(),
  currency: planCurrencySchema.optional(),
  durationDays: planDurationSchema.optional(),
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

  const priceChanged =
    (parsed.data.price !== undefined && Number(parsed.data.price) !== Number(existing.price)) ||
    (parsed.data.currency !== undefined && parsed.data.currency !== existing.currency)

  const plan = await prisma
    .$transaction(async (tx) => {
      const updated = await tx.membershipPlan
        .update({ where: { id }, data: parsed.data })
        .catch((error: unknown) => {
          const code =
            error && typeof error === "object" && "code" in error
              ? (error as { code?: string }).code
              : undefined
          if (code === "P2002") return null
          throw error
        })
      if (!updated) return null

      if (priceChanged) {
        await tx.membershipPlanPriceHistory.create({
          data: {
            planId: id,
            oldPrice: existing.price,
            newPrice: updated.price,
            oldCurrency: existing.currency,
            newCurrency: updated.currency,
            changedById: user.id,
          },
        })
      }

      return updated
    })
    .catch((error: unknown) => {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined
      if (code === "P2002") return null
      throw error
    })

  if (!plan) {
    return NextResponse.json(
      {
        error: "Ya existe un plan con ese nombre en el gimnasio",
        details: { fieldErrors: { name: ["Nombre duplicado"] } },
      },
      { status: 409 }
    )
  }

  if (priceChanged) {
    const members = await prisma.membership.findMany({
      where: { planId: id, status: "ACTIVE", endDate: { gt: new Date() } },
      select: { userId: true },
    })
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((member) => ({
          userId: member.userId,
          title: "Nuevo precio de membresía",
          message: `El precio de ${plan.name} cambió a ${plan.currency} ${Number(plan.price).toFixed(2)}. Al renovar puedes aceptarlo o rechazarlo.`,
          type: "MEMBERSHIP",
          metadata: {
            planId: plan.id,
            oldPrice: Number(existing.price),
            newPrice: Number(plan.price),
          },
        })),
      })
    }
  }

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
