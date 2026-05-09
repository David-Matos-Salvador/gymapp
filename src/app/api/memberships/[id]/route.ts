import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateMembershipSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"]).optional(),
  paymentConfirmed: z.boolean().optional(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD", "STRIPE", "OTHER"]).optional(),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
  autoRenew: z.boolean().optional(),
})

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
  const existing = await prisma.membership.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateMembershipSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const membership = await prisma.membership.update({
    where: { id },
    data: parsed.data,
    include: { plan: true, user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ membership })
}
