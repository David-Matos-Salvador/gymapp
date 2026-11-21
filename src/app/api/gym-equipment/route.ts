import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageGymEquipment } from "@/lib/gym-equipment"
import { isSuperAdmin } from "@/lib/authz"
import { imageUrlSchema } from "@/lib/validation"

const createEquipmentSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  location: z.string().optional(),
  imageUrl: imageUrlSchema.optional(),
  exerciseId: z.string().optional(),
  machineNumber: z.number().int().min(1).max(9999).optional().nullable(),
  gymId: z.string().min(1),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true, gymId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedGymId = searchParams.get("gymId")

  // Cada persona ve el equipo del sistema y el de su gimnasio; el súper admin elige gimnasio.
  const gymId = isSuperAdmin(user.role) ? requestedGymId : user.gymId
  const where =
    isSuperAdmin(user.role) && !gymId
      ? undefined
      : { OR: [{ isSystem: true }, ...(gymId ? [{ gymId }] : [])] }

  const equipment = await prisma.gymEquipment.findMany({
    where,
    include: { exercise: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
    take: 1000,
  })

  return NextResponse.json({ equipment })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createEquipmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const targetGymId = user.role === "SUPER_ADMIN" ? parsed.data.gymId : user.gymId
  if (!targetGymId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const gym = await prisma.gym.findUnique({
    where: { id: targetGymId },
    select: { id: true, ownerId: true },
  })

  if (!canManageGymEquipment(user, gym)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const equipment = await prisma.gymEquipment.create({
    data: { ...parsed.data, gymId: targetGymId },
    include: { exercise: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ equipment }, { status: 201 })
}
