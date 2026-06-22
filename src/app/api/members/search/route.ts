import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") || searchParams.get("email")

  if (!q) {
    return NextResponse.json({ error: "Término de búsqueda requerido" }, { status: 400 })
  }

  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      email: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      assignedTrainerId: true,
    },
    take: 10,
    orderBy: { email: "asc" },
  })

  return NextResponse.json({ members })
}
