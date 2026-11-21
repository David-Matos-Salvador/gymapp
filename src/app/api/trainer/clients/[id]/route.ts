import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { healthConditionsOf } from "@/lib/health-conditions"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  if (!user.gymId) {
    return NextResponse.json({ error: "Sin gimnasio asignado" }, { status: 403 })
  }

  const { id } = await params

  const client = await prisma.user.findUnique({
    where: { id, assignedTrainerId: user.id, gymId: user.gymId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      sex: true,
      birthDate: true,
      objective: true,
      experienceLevel: true,
      medicalNotes: true,
      emergencyContact: true,
      emergencyPhone: true,
      onboardingCompleted: true,
      onboardingData: true,
      bodyMeasurements: { orderBy: { date: "desc" }, take: 10 },
      assignedRoutinePlans: {
        where: { active: true },
        include: {
          plan: {
            include: {
              splits: {
                include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      workoutLogs: {
        include: { sets: { orderBy: { setNumber: "asc" } } },
        orderBy: { date: "desc" },
        take: 20,
      },
      checkIns: { orderBy: { date: "desc" }, take: 30 },
      memberShips: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  }

  // De las respuestas del onboarding, el coach solo necesita las condiciones físicas.
  const { onboardingData, ...rest } = client
  return NextResponse.json({ client: { ...rest, ...healthConditionsOf(onboardingData) } })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  if (!user.gymId) {
    return NextResponse.json({ error: "Sin gimnasio asignado" }, { status: 403 })
  }

  const { id } = await params
  const client = await prisma.user.findUnique({
    where: { id, assignedTrainerId: user.id, gymId: user.gymId },
  })
  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { assignedTrainerId: null } }),
    prisma.trainerRequest.updateMany({
      where: { clientId: id, trainerId: user.id, status: "ACCEPTED" },
      data: { status: "REJECTED", rejectedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        userId: id,
        title: "Entrenador desasignado",
        message: `${user.name || "Tu entrenador"} ya no está asignado como tu coach.`,
        type: "INFO",
        metadata: { trainerId: user.id },
      },
    }),
  ])
  return NextResponse.json({ success: true })
}
