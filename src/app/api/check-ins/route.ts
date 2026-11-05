import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const where: Record<string, unknown> = { userId: user.id }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)
    where.date = dateFilter
  }

  const checkIns = await prisma.checkIn.findMany({
    where,
    orderBy: { date: "desc" },
  })

  return NextResponse.json({ checkIns })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, gymId: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const { gymId: requestedGymId } = z.object({ gymId: z.string().optional() }).parse(body)

  if (user.gymId && requestedGymId && requestedGymId !== user.gymId) {
    return NextResponse.json(
      { error: "No puedes registrar check-in en otro gimnasio" },
      { status: 400 }
    )
  }

  const gymId = user.gymId ?? requestedGymId
  if (!gymId) {
    return NextResponse.json({ error: "Sin gimnasio asignado" }, { status: 400 })
  }

  const checkIn = await prisma.checkIn.create({
    data: { userId: user.id, gymId, date: new Date() },
  })

  return NextResponse.json({ checkIn }, { status: 201 })
}
