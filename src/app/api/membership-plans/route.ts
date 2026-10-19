import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin } from "@/lib/authz"
import {
  PLAN_CURRENCY,
  planCurrencySchema,
  planDurationSchema,
  planPriceSchema,
} from "@/lib/membership-pricing"

const createPlanSchema = z.object({
  gymId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  price: planPriceSchema,
  currency: planCurrencySchema.default(PLAN_CURRENCY),
  durationDays: planDurationSchema,
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedGymId = searchParams.get("gymId")
  const session = await auth()

  let gymId = requestedGymId

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true, gymId: true },
    })
    if (user && !isSuperAdmin(user.role)) {
      gymId = user.gymId ?? "__no_gym__"
    }
  }

  if (!gymId) {
    return NextResponse.json({ error: "gymId requerido" }, { status: 400 })
  }

  const plans = await prisma.membershipPlan.findMany({
    where: { active: true, gymId },
    orderBy: { price: "asc" },
  })

  return NextResponse.json({ plans })
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
  if (!user || user.role === "TRAINER" || user.role === "MEMBER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, description, price, currency, durationDays } = parsed.data
  const gymId = isSuperAdmin(user.role) ? parsed.data.gymId : user.gymId

  if (!gymId) {
    return NextResponse.json({ error: "Sin gimnasio asignado" }, { status: 403 })
  }
  if (!isSuperAdmin(user.role) && parsed.data.gymId !== gymId) {
    return NextResponse.json({ error: "Sin permisos sobre este gimnasio" }, { status: 403 })
  }

  const gym = await prisma.gym.findUnique({ where: { id: gymId } })
  if (!gym) {
    return NextResponse.json({ error: "Gimnasio no encontrado" }, { status: 404 })
  }
  if (gym.isDefault) {
    return NextResponse.json({ error: "El gimnasio por defecto no admite planes" }, { status: 409 })
  }

  const plan = await prisma.membershipPlan
    .create({
      data: { gymId, name, description, price, currency, durationDays },
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

  return NextResponse.json({ plan }, { status: 201 })
}
