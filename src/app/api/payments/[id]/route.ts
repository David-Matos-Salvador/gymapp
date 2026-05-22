import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updatePaymentSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  method: z.enum(["CASH", "TRANSFER", "CARD", "STRIPE", "OTHER"]).optional(),
  type: z.enum(["MEMBERSHIP", "CLASS_BOOKING", "OTHER"]).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request, { params }: RouteParams) {
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
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (!payment) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && payment.userId !== user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    return NextResponse.json({ payment })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.payment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updatePaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: parsed.data,
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json({ payment })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
