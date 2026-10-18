import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.role === "ADMIN") {
    if (targetUser.gymId !== user.gymId || plan.gymId !== user.gymId) {
      return NextResponse.json({ error: "Sin permisos sobre este gimnasio" }, { status: 403 })
    }
  }

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + plan.durationDays)

  const membership = await prisma.membership.create({
    data: {
      userId,
      planId,
      startDate,
      endDate,
      paymentMethod,
      paymentRef,
      notes,
      autoRenew,
    },
    include: { plan: true },
  })

  return NextResponse.json({ membership }, { status: 201 })
}
