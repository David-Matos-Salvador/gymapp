import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
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

    const { id } = await params
    const existing = await prisma.checkIn.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Check-in no encontrado" }, { status: 404 })
    }

    if (existing.userId !== user.id) {
      if (user.role === "SUPER_ADMIN") {
        // allowed
      } else if (user.role === "ADMIN") {
        if (!user.gymId || existing.gymId !== user.gymId) {
          return NextResponse.json({ error: "Check-in no encontrado" }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }
    }

    await prisma.checkIn.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
