import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(_request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { id } = await params

  const assignment = await prisma.assignedRoutinePlan.findUnique({ where: { id } })
  if (!assignment) {
    return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
  }

  await prisma.assignedRoutinePlan.update({
    where: { id },
    data: { active: false },
  })

  return NextResponse.json({ success: true })
}
