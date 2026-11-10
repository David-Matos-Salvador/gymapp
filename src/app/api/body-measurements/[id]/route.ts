import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { bodyMeasurementSchema } from "@/lib/validation"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateMeasurementSchema = bodyMeasurementSchema

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const { id } = await params
  const existing = await prisma.bodyMeasurement.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Medición no encontrada" }, { status: 404 })
  }
  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateMeasurementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const measurement = await prisma.bodyMeasurement.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ measurement })
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
  const existing = await prisma.bodyMeasurement.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Medición no encontrada" }, { status: 404 })
  }
  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  await prisma.bodyMeasurement.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
