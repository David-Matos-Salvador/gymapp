import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const workoutLog = await prisma.workoutLog.findUnique({
    where: { id },
    include: { sets: { orderBy: { setNumber: "asc" } }, routine: true },
  })

  if (!workoutLog) {
    return NextResponse.json({ error: "Log de entrenamiento no encontrado" }, { status: 404 })
  }
  if (workoutLog.userId !== user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  return NextResponse.json({ workoutLog })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const workoutLog = await prisma.workoutLog.findUnique({ where: { id } })
  if (!workoutLog) {
    return NextResponse.json({ error: "Log de entrenamiento no encontrado" }, { status: 404 })
  }
  if (workoutLog.userId !== user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  await prisma.workoutLog.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
