import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const split = await prisma.routineSplit.findUnique({
    where: { id },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
      plan: { select: { id: true, name: true } },
    },
  })

  if (!split) {
    return NextResponse.json({ error: "Split no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ split })
}
