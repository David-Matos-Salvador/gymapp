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

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { id } = await params
    const existing = await prisma.progressPhoto.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 })
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    await prisma.progressPhoto.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
