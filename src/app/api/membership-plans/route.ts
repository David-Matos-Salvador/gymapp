import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createPlanSchema = z.object({
  gymId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default("MXN"),
  durationDays: z.number().int().positive(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gymId = searchParams.get("gymId")

  const where: Record<string, unknown> = { active: true }
  if (gymId) {
    where.gymId = gymId
  }

  const plans = await prisma.membershipPlan.findMany({
    where,
    orderBy: { price: "asc" },
  })

  return NextResponse.json({ plans })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
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

  const { gymId, name, description, price, currency, durationDays } = parsed.data

  const gym = await prisma.gym.findUnique({ where: { id: gymId } })
  if (!gym) {
    return NextResponse.json({ error: "Gimnasio no encontrado" }, { status: 404 })
  }

  const plan = await prisma.membershipPlan.create({
    data: { gymId, name, description, price, currency, durationDays },
  })

  return NextResponse.json({ plan }, { status: 201 })
}
