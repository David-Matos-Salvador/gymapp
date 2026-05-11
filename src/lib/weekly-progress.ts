import { cache } from "react"
import { prisma } from "@/lib/prisma"

function getWeekBounds(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export const getNextPropuestoSplit = cache(async (userId: string, planId: string) => {
  const [splits, lastLog] = await Promise.all([
    prisma.routineSplit.findMany({
      where: { planId },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    }),
    prisma.workoutLog.findFirst({
      where: { userId, split: { planId } },
      orderBy: { createdAt: "desc" },
      include: { split: { select: { order: true } } },
    }),
  ])

  if (splits.length === 0) return null

  const lastSplit = lastLog?.split ?? null
  const lastIndex = lastSplit ? splits.findIndex((s) => s.order === lastSplit.order) : -1
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % splits.length
  return splits[nextIndex].id
})

export const getWeeklyProgress = cache(async (userId: string, frequency: number) => {
  const now = new Date()
  const { monday } = getWeekBounds(now)

  const count = await prisma.workoutLog.count({
    where: {
      userId,
      date: { gte: monday, lte: now },
    },
  })

  return { completed: count, target: frequency, percent: Math.round((count / frequency) * 100) }
})

export const getWeeklyStreak = cache(async (userId: string, frequency: number) => {
  const fiftyTwoWeeksAgo = new Date()
  fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - 364)

  const logs = await prisma.workoutLog.findMany({
    where: {
      userId,
      date: { gte: fiftyTwoWeeksAgo },
    },
    select: { date: true },
    orderBy: { date: "desc" },
  })

  const weekCounts = new Map<string, number>()

  for (const log of logs) {
    const weekStart = getWeekStart(log.date)
    const key = weekStart.toISOString()
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1)
  }

  const currentWeekStart = getWeekStart(new Date()).toISOString()
  const orderedWeeks = Array.from(weekCounts.keys()).sort().reverse()

  let streak = 0
  let bestStreak = 0
  let currentStreak = 0
  let counting = true

  for (const week of orderedWeeks) {
    const count = weekCounts.get(week)!
    if (count >= frequency) {
      currentStreak++
      if (currentStreak > bestStreak) bestStreak = currentStreak
    } else {
      if (week === currentWeekStart) continue
      if (counting) {
        streak = currentStreak
        counting = false
      }
      currentStreak = 0
    }
  }

  if (counting) {
    streak = currentStreak
  }

  return { streak, bestStreak }
})

export const getWorkoutsThisWeek = cache(async (userId: string): Promise<Date[]> => {
  const now = new Date()
  const { monday } = getWeekBounds(now)

  const logs = await prisma.workoutLog.findMany({
    where: { userId, date: { gte: monday, lte: now } },
    select: { date: true },
  })

  return logs.map((l) => l.date)
})

export const getUser = cache(async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, name: true, onboardingCompleted: true },
  })
})

export const getBestStreak = cache(async (userId: string, frequency: number) => {
  const { bestStreak } = await getWeeklyStreak(userId, frequency)
  return bestStreak
})
