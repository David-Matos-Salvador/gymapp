import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageGymEquipment } from "@/lib/gym-equipment"
import { imageUrlSchema } from "@/lib/validation"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateEquipmentSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  imageUrl: imageUrlSchema.optional().nullable(),
  exerciseId: z.string().optional().nullable(),
  machineNumber: z.number().int().min(1).max(9999).optional().nullable(),
})

interface AuthResult {
  error: NextResponse | null
  user: { id: string; role: string; gymId: string | null } | null
}

async function requireEquipmentManager(): Promise<AuthResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }), user: null }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }), user: null }
  }

  return { error: null, user }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { error, user } = await requireEquipmentManager()
  if (error) return error

  const { id } = await params

  const existing = await prisma.gymEquipment.findUnique({
    where: { id },
    select: { id: true, gymId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  if (!user) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  // System equipment (gymId = null) can only be edited by SUPER_ADMIN
  if (!existing.gymId) {
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
  } else {
    const gym = await prisma.gym.findUnique({
      where: { id: existing.gymId },
      select: { id: true, ownerId: true },
    })

    if (!canManageGymEquipment(user, gym)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
  }

  const body = await request.json()
  const parsed = updateEquipmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const equipment = await prisma.gymEquipment.update({
    where: { id },
    data: parsed.data,
    include: { exercise: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ equipment })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { error, user } = await requireEquipmentManager()
  if (error) return error

  const { id } = await params

  const existing = await prisma.gymEquipment.findUnique({
    where: { id },
    select: { id: true, gymId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  if (!user) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  // System equipment (gymId = null) can only be edited by SUPER_ADMIN
  if (!existing.gymId) {
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
  } else {
    const gym = await prisma.gym.findUnique({
      where: { id: existing.gymId },
      select: { id: true, ownerId: true },
    })

    if (!canManageGymEquipment(user, gym)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
  }

  await prisma.gymEquipment.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
