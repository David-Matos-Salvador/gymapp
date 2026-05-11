import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import {
  getNextPropuestoSplit,
  getWeeklyProgress,
  getWeeklyStreak,
  getWorkoutsThisWeek,
} from "@/lib/weekly-progress"
import { RutinaClient } from "../rutina-client"

interface PageProps {
  params: Promise<{ planId: string }>
}

export default async function RutinaDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) redirect("/login")
  if (user.role !== "MEMBER") {
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") redirect("/admin")
    if (user.role === "TRAINER") redirect("/coach")
  }

  if (!user.onboardingCompleted) redirect("/onboarding")

  const { planId } = await params

  const assignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, planId, active: true },
    include: {
      plan: {
        include: {
          splits: {
            include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  })

  if (!assignment?.plan) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
          <h2 className="text-xl font-bold">Rutina no encontrada</h2>
          <p className="text-sm text-muted-foreground">
            Esta rutina no está disponible o no te fue asignada.
          </p>
        </div>
      </AppShell>
    )
  }

  const plan = assignment.plan
  const frequency = plan.frequency ?? 3

  const [propuestoSplitId, weeklyProgress, weeklyStreakData, workoutDates] = await Promise.all([
    getNextPropuestoSplit(user.id, plan.id),
    getWeeklyProgress(user.id, frequency),
    getWeeklyStreak(user.id, frequency),
    getWorkoutsThisWeek(user.id),
  ])

  const serializedSplits = plan.splits.map((split) => ({
    id: split.id,
    label: split.label,
    name: split.name,
    description: split.description,
    muscleGroups: split.muscleGroups,
    exerciseCount: split.exercises.length,
    estimatedDuration: split.estimatedDuration,
    exerciseIds: split.exercises.map((e) => e.exerciseId),
  }))

  const isExpiringSoon = assignment.expiresAt
    ? new Date(assignment.expiresAt).getTime() - Date.now() < 7 * 86400000
    : false

  return (
    <AppShell>
      <RutinaClient
        userName={user.name?.split(" ")[0] ?? "Atleta"}
        planId={plan.id}
        planName={plan.name}
        planDescription={plan.description}
        splits={serializedSplits}
        propuestoSplitId={propuestoSplitId}
        expiresAt={assignment.expiresAt?.toISOString() ?? null}
        isExpiringSoon={isExpiringSoon}
        weeklyCompleted={weeklyProgress.completed}
        weeklyTarget={weeklyProgress.target}
        workoutDates={workoutDates.map((d) => d.toISOString())}
        weeklyStreak={weeklyStreakData.streak}
        bestStreak={weeklyStreakData.bestStreak}
      />
    </AppShell>
  )
}
