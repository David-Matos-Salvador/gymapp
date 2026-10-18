import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  let clientIds: string[] = []

  if (user.role === "TRAINER") {
    const trainerRequests = await prisma.trainerRequest.findMany({
      where: { trainerId: user.id, status: "ACCEPTED" },
      select: { clientId: true },
    })

    const assignedClients = await prisma.user.findMany({
      where: { assignedTrainerId: user.id },
      select: { id: true },
    })

    const idSet = new Set([
      ...trainerRequests.map((tr) => tr.clientId),
      ...assignedClients.map((c) => c.id),
    ])
    clientIds = Array.from(idSet)

    if (clientIds.length === 0) {
      return NextResponse.json({ payments: [] })
    }
  }

  const where =
    user.role === "TRAINER"
      ? { status: "PENDING" as const, userId: { in: clientIds } }
      : user.role === "ADMIN"
        ? {
            status: "PENDING" as const,
            user: { gymId: user.gymId ?? "__no_gym__" },
          }
        : { status: "PENDING" as const }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, gymId: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ payments })
}
