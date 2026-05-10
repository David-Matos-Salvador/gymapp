import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getWeeklyProgress, getWeeklyStreak, getBestStreak } from "@/lib/weekly-progress"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const assignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true },
    select: { plan: { select: { frequency: true } } },
  })

  const frequency = assignment?.plan?.frequency ?? 3

  const [weeklyProgress, weeklyStreakData, bestStreak] = await Promise.all([
    getWeeklyProgress(user.id, frequency),
    getWeeklyStreak(user.id, frequency),
    getBestStreak(user.id, frequency),
  ])

  return NextResponse.json({
    weeklyCompleted: weeklyProgress.completed,
    weeklyTarget: weeklyProgress.target,
    weeklyStreak: weeklyStreakData.streak,
    bestStreak,
  })
}
