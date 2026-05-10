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

  const plan = await prisma.routinePlan.findUnique({
    where: { id },
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!plan) {
    return NextResponse.json({ error: "Rutina no encontrada" }, { status: 404 })
  }

  return NextResponse.json({ plan })
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

  const plan = await prisma.routinePlan.update({
    where: { id },
    data: { name, description },
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  })

  return NextResponse.json({ plan })
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
  await prisma.routinePlan.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
