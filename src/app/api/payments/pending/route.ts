import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const myClientIds = await prisma.trainerRequest.findMany({
    where: { trainerId: user.id, status: "ACCEPTED" },
    select: { clientId: true },
  })

  const payments = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      userId: { in: myClientIds.map((r) => r.clientId) },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ payments })
}
