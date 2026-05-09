import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateEquipmentSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  exerciseId: z.string().optional().nullable(),
})

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.gymEquipment.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  if (user.role === "TRAINER" && user.gymId && existing.gymId !== user.gymId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
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
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.gymEquipment.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  if (user.role === "TRAINER" && user.gymId && existing.gymId !== user.gymId) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  await prisma.gymEquipment.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
