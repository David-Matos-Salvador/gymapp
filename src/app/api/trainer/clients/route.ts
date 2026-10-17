import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { emitRealtime } from "@/lib/realtime"
import { getTrainerClientIds, hasAnyTrainer } from "@/lib/trainer-client"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const clientIds = await getTrainerClientIds(user.id)

  const clients =
    clientIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: clientIds } },
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
      : []

  return NextResponse.json({ clients })
}

const sendRequestSchema = z.object({ clientId: z.string().min(1) })

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
  const { clientId } = sendRequestSchema.parse(body)

  const client = await prisma.user.findUnique({ where: { id: clientId } })
  if (!client) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }
  if (client.role !== "MEMBER") {
    return NextResponse.json(
      { error: "Solo se puede enviar solicitud a miembros" },
      { status: 400 }
    )
  }
  const hasTrainer = await hasAnyTrainer(clientId)
  if (hasTrainer) {
    return NextResponse.json(
      { error: "El usuario ya tiene un entrenador asignado" },
      { status: 409 }
    )
  }

  const existing = await prisma.trainerRequest.findFirst({
    where: { trainerId: user.id, clientId, status: "PENDING" },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una solicitud pendiente para este usuario" },
      { status: 409 }
    )
  }

  const trainerRequest = await prisma.trainerRequest.create({
    data: { trainerId: user.id, clientId },
  })

  await prisma.notification.create({
    data: {
      userId: clientId,
      title: "Solicitud de entrenador",
      message: `${user.name || "Un entrenador"} quiere ser tu coach. Revisa y acepta la solicitud.`,
      type: "TRAINER_REQUEST",
      metadata: { requestId: trainerRequest.id, trainerId: user.id, trainerName: user.name },
    },
  })

  emitRealtime("notifications")

  return NextResponse.json({ request: trainerRequest }, { status: 201 })
}
