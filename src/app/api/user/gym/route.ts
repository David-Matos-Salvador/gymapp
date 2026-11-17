import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const joinGymSchema = z.object({ gymId: z.string().min(1) })

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }
  if (user.role !== "MEMBER") {
    return NextResponse.json({ error: "Solo los miembros pueden vincularse" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = joinGymSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta indicar el gimnasio" }, { status: 400 })
  }

  if (user.gymId && user.gymId !== parsed.data.gymId) {
    return NextResponse.json(
      { error: "Ya perteneces a un gimnasio. Contacta al gimnasio para cambiarlo." },
      { status: 409 }
    )
  }

  const gym = await prisma.gym.findUnique({
    where: { id: parsed.data.gymId },
    select: { id: true, name: true, active: true, isDefault: true },
  })
  if (!gym || !gym.active || gym.isDefault) {
    return NextResponse.json({ error: "Gimnasio no encontrado" }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { gymId: gym.id },
  })

  return NextResponse.json({ gym: { id: gym.id, name: gym.name } })
}
