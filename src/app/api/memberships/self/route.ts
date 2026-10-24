import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"

const selfMembershipSchema = z.object({ planId: z.string().min(1) })

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
  if (!user || user.role !== "MEMBER" || !user.gymId) {
    return NextResponse.json(
      { error: "Necesitás un gimnasio para adquirir un plan" },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const parsed = selfMembershipSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "planId requerido" }, { status: 400 })
  }

  const plan = await prisma.membershipPlan.findUnique({ where: { id: parsed.data.planId } })
  if (!plan || !plan.active || plan.gymId !== user.gymId || plan.currency !== "PEN") {
    return NextResponse.json({ error: "Plan no encontrado o inactivo" }, { status: 404 })
  }
  if (Number(plan.price) !== 0) {
    return NextResponse.json(
      { error: "Este plan requiere un comprobante de pago" },
      { status: 400 }
    )
  }

  const active = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE", endDate: { gt: new Date() } },
    select: { id: true },
  })
  if (active) {
    return NextResponse.json(
      { error: "Ya tenés una membresía vigente. Renovala en lugar de comprar otra." },
      { status: 409 }
    )
  }

  const now = new Date()
  const endDate = new Date(now.getTime() + plan.durationDays * 86400000)

  try {
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: "ACTIVE",
        startDate: now,
        endDate,
        paymentConfirmed: true,
        paymentMethod: "OTHER",
        planPrice: plan.price,
        planCurrency: plan.currency,
        planDurationDays: plan.durationDays,
      },
      include: { plan: true },
    })
    return NextResponse.json({ membership }, { status: 201 })
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined
    if (code === "P2002") {
      return NextResponse.json({ error: "Ya tenés una membresía con ese plan" }, { status: 409 })
    }
    logger.error("Self membership creation failed", {
      requestId,
      context: { route: "POST /api/memberships/self", userId: user.id },
      error,
    })
    throw error
  }
}
