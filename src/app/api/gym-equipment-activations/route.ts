import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageGymEquipment } from "@/lib/gym-equipment"
import { imageUrlSchema } from "@/lib/validation"
import { z } from "zod"

const activationSchema = z.object({
  equipmentId: z.string().min(1),
  gymId: z.string().optional(),
  active: z.boolean().optional(),
  machineNumber: z.number().int().min(1).max(9999).optional().nullable(),
  imageUrl: imageUrlSchema.optional().nullable(),
})

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = activationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { equipmentId, active, machineNumber, imageUrl } = parsed.data
  const isSuper = user.role === "SUPER_ADMIN"
  const gymId = isSuper ? (parsed.data.gymId ?? user.gymId) : user.gymId

  if (!gymId) {
    return NextResponse.json({ error: "Sin gimnasio seleccionado" }, { status: 403 })
  }
  if (!isSuper && parsed.data.gymId && parsed.data.gymId !== user.gymId) {
    return NextResponse.json({ error: "Sin permisos sobre este gimnasio" }, { status: 403 })
  }

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, ownerId: true },
  })
  if (!canManageGymEquipment(user, gym)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const equipment = await prisma.gymEquipment.findUnique({
    where: { id: equipmentId },
    select: { id: true },
  })
  if (!equipment) {
    return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 })
  }

  const data = {
    ...(active !== undefined ? { active } : {}),
    ...(machineNumber !== undefined ? { machineNumber } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  }

  const activation = await prisma.gymEquipmentActivation.upsert({
    where: { gymId_equipmentId: { gymId, equipmentId } },
    update: data,
    create: {
      gymId,
      equipmentId,
      active: active ?? true,
      machineNumber: machineNumber ?? null,
      imageUrl: imageUrl ?? null,
    },
  })

  if (machineNumber != null) {
    await prisma.gym.update({
      where: { id: gymId },
      data: { showMachineNumbers: true },
    })
  }

  return NextResponse.json({
    success: true,
    active: activation.active,
    machineNumber: activation.machineNumber,
    imageUrl: activation.imageUrl,
  })
}
