import { NextResponse } from "next/server"
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

/**
 * El check-in está apagado hasta que exista la feature con su pantalla (MBR-18, #225):
 * cuando vuelva, debe exigir membresía activa y pagada, solo miembros, una vez por día
 * calendario y el gimnasio del usuario. Mientras tanto no se registra ninguno.
 */
export async function POST() {
  return NextResponse.json({ error: "El check-in todavía no está disponible" }, { status: 404 })
}
