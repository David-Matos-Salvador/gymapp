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

  const { id } = await params

  const routine = await prisma.routine.findUnique({
    where: { id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!routine) {
    return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ routine })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, description } = body

  const routine = await prisma.routine.update({
    where: { id },
    data: { name, description },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  return NextResponse.json({ routine })
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params
  await prisma.routine.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
