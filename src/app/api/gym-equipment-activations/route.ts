import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const toggleSchema = z.object({
  equipmentId: z.string().min(1),
  active: z.boolean(),
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
  if (!user || !user.gymId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = toggleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const { equipmentId, active } = parsed.data

  await prisma.gymEquipmentActivation.upsert({
    where: { gymId_equipmentId: { gymId: user.gymId, equipmentId } },
    update: { active },
    create: { gymId: user.gymId, equipmentId, active },
  })

  return NextResponse.json({ success: true, active })
}
