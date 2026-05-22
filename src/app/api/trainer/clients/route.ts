import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const clients = await prisma.user.findMany({
    where: { assignedTrainerId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      objective: true,
      experienceLevel: true,
      createdAt: true,
      memberShips: {
        include: { plan: true },
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ clients })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const { clientId } = z.object({ clientId: z.string().min(1) }).parse(body)

  const client = await prisma.user.findUnique({ where: { id: clientId } })
  if (!client) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }
  if (client.assignedTrainerId) {
    return NextResponse.json({ error: "El usuario ya tiene un entrenador asignado" }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: clientId },
    data: { assignedTrainerId: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      objective: true,
      experienceLevel: true,
    },
  })

  return NextResponse.json({ client: updated })
}
