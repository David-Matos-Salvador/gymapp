import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Un miembro con onboarding marcado como terminado pero sin rutina vuelve a las recomendaciones
export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })
  if (!user || user.role !== "MEMBER") {
    return NextResponse.json(
      { error: "Solo los miembros pueden elegir una rutina" },
      { status: 403 }
    )
  }

  const assignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true },
    select: { id: true },
  })
  if (assignment) {
    return NextResponse.json({ error: "Ya tienes una rutina asignada" }, { status: 409 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: false, onboardingCompletedAt: null },
  })
  return NextResponse.json({ ok: true })
}
