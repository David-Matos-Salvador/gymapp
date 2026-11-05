import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"

const createMembershipSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD", "STRIPE", "YAPE", "OTHER"]).default("CASH"),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
  autoRenew: z.boolean().default(false),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ membership })
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createMembershipSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { userId, planId, paymentMethod, paymentRef, notes, autoRenew } = parsed.data

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
  }
  if (!plan.active) {
    return NextResponse.json(
      { error: "El plan está inactivo; elige un plan activo" },
      { status: 409 }
    )
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.role === "ADMIN") {
    if (targetUser.gymId !== user.gymId || plan.gymId !== user.gymId) {
      return NextResponse.json({ error: "Sin permisos sobre este gimnasio" }, { status: 403 })
    }
  }

  const activeMembership = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gt: new Date() } },
    select: { id: true },
  })
  if (activeMembership) {
    return NextResponse.json(
      { error: "El miembro ya tiene una membresía vigente. Renuévala en lugar de crear otra." },
      { status: 409 }
    )
  }

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + plan.durationDays)

  const membership = await prisma.membership
    .create({
      data: {
        userId,
        planId,
        startDate,
        endDate,
        paymentRef,
        notes,
        autoRenew,
        paymentConfirmed: Number(plan.price) === 0,
        paymentMethod: Number(plan.price) === 0 ? "OTHER" : paymentMethod,
        planPrice: plan.price,
        planCurrency: plan.currency,
        planDurationDays: plan.durationDays,
      },
      include: { plan: true },
    })
    .catch((error: unknown) => {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined
      if (code === "P2002") return null
      logger.error("Membership creation failed", {
        requestId,
        context: { route: "POST /api/memberships", userId: user.id },
        error,
      })
      throw error
    })

  if (!membership) {
    return NextResponse.json(
      {
        error: "Ya existe una membresía para ese miembro y plan. Usa renovar o elige otro plan.",
      },
      { status: 409 }
    )
  }

  return NextResponse.json({ membership }, { status: 201 })
}
