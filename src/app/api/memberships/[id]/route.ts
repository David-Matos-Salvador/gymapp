import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateRenewal } from "@/lib/membership-dates"

interface RouteParams {
  params: Promise<{ id: string }>
}

const MEMBERSHIP_STATUSES = ["ACTIVE", "INACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"] as const

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "STRIPE", "OTHER"] as const

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"])

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida")

const updateMembershipSchema = z.object({
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
  paymentConfirmed: z.boolean().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
  autoRenew: z.boolean().optional(),
  renew: z.boolean().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
})

type MembershipUpdateData = {
  status?: (typeof MEMBERSHIP_STATUSES)[number]
  paymentConfirmed?: boolean
  paymentMethod?: (typeof PAYMENT_METHODS)[number]
  paymentRef?: string
  notes?: string
  autoRenew?: boolean
  startDate?: Date
  endDate?: Date
}

const membershipInclude = {
  plan: true,
  user: { select: { id: true, name: true, email: true } },
} as const

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
  const existing = await prisma.membership.findUnique({
    where: { id },
    include: { plan: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 })
  }

  const isAdmin = ADMIN_ROLES.has(user.role)

  // D-08: members may only renew their own membership. Never allow cross-user edits.
  if (!isAdmin && existing.userId !== user.id) {
    return NextResponse.json(
      { error: "No autorizado para modificar esta membresía" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const parsed = updateMembershipSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const input = parsed.data
  const hasDateOverride = input.startDate !== undefined || input.endDate !== undefined

  if (!isAdmin) {
    // D-08: non-admin clients can only ask for a server-calculated renewal.
    const forbiddenField = Object.entries(input).find(
      ([key, value]) => key !== "renew" && value !== undefined
    )
    if (forbiddenField) {
      return NextResponse.json(
        { error: "No autorizado para modificar esta membresía" },
        { status: 403 }
      )
    }
    if (input.renew !== true) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 })
    }
  }

  if (input.renew) {
    const conflictingField = Object.entries(input).find(
      ([key, value]) => key !== "renew" && value !== undefined
    )
    if (conflictingField) {
      return NextResponse.json(
        { error: "No combines renew con otras modificaciones" },
        { status: 400 }
      )
    }

    try {
      // D-01: renewal dates are always calculated on the server.
      const renewal = calculateRenewal(existing, existing.plan)
      const membership = await prisma.membership.update({
        where: { id },
        data: renewal,
        include: membershipInclude,
      })

      return NextResponse.json({ membership })
    } catch (error) {
      if (error instanceof RangeError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }
  }

  const data: MembershipUpdateData = {}
  if (input.status !== undefined) data.status = input.status
  if (input.paymentConfirmed !== undefined) data.paymentConfirmed = input.paymentConfirmed
  if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod
  if (input.paymentRef !== undefined) data.paymentRef = input.paymentRef
  if (input.notes !== undefined) data.notes = input.notes
  if (input.autoRenew !== undefined) data.autoRenew = input.autoRenew

  if (hasDateOverride) {
    const now = new Date()
    const startDate = input.startDate ? new Date(input.startDate) : existing.startDate
    const endDate = input.endDate ? new Date(input.endDate) : existing.endDate

    if (endDate.getTime() <= startDate.getTime()) {
      return NextResponse.json(
        { error: "La fecha de fin debe ser posterior a la fecha de inicio" },
        { status: 400 }
      )
    }

    if (
      existing.endDate.getTime() > now.getTime() &&
      endDate.getTime() < existing.endDate.getTime()
    ) {
      return NextResponse.json(
        { error: "No se puede acortar una fecha de fin futura" },
        { status: 400 }
      )
    }

    data.startDate = startDate
    data.endDate = endDate
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 })
  }

  const membership = await prisma.membership.update({
    where: { id },
    data,
    include: membershipInclude,
  })

  return NextResponse.json({ membership })
}
