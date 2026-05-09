import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createEquipmentSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string().url().optional(),
  exerciseId: z.string().optional(),
  gymId: z.string().min(1),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gymId = searchParams.get("gymId")

  const equipment = await prisma.gymEquipment.findMany({
    where: gymId ? { gymId } : undefined,
    include: { exercise: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ equipment })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
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

  const equipment = await prisma.gymEquipment.create({
    data: parsed.data,
    include: { exercise: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ equipment }, { status: 201 })
}
