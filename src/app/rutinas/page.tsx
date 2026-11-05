import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import {
  getNextPropuestoSplit,
  getWeeklyProgress,
  getWeeklyStreak,
  getWorkoutsThisWeek,
  getUser,
} from "@/lib/weekly-progress"
import { ChooseRoutineButton } from "@/components/rutina/choose-routine-button"
import { RutinaClient } from "./rutina-client"

export default async function RutinasPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await getUser(session.user.email)
  if (!user) redirect("/login")
  if (user.role !== "MEMBER") {
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") redirect("/admin")
    if (user.role === "TRAINER") redirect("/coach")
  }
  if (!user.onboardingCompleted) redirect("/onboarding")

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { status: true, endDate: true, paymentConfirmed: true },
    orderBy: { endDate: "desc" },
  })
  const membershipStatus = membership
    ? membership.status !== "ACTIVE" || membership.endDate <= new Date()
      ? "EXPIRED"
      : !membership.paymentConfirmed
        ? "PENDING_PAYMENT"
        : "ACTIVE"
    : "ACTIVE"

  const assignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true },
    select: {
      expiresAt: true,
      plan: {
        select: {
          id: true,
          name: true,
          description: true,
          frequency: true,
          splits: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              label: true,
              name: true,
              description: true,
              muscleGroups: true,
              estimatedDuration: true,
              exercises: {
                orderBy: { order: "asc" },
                select: { exerciseId: true },
              },
            },
          },
        },
      },
    },
  })

  if (!assignment?.plan) {
    const firstName = user.name?.split(" ")[0] ?? "Atleta"
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
          <h2 className="text-xl font-bold">Hola, {firstName}</h2>
          <p className="text-sm text-muted-foreground">
            No tienes una rutina personalizada asignada.
          </p>
          <ChooseRoutineButton />
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
    ? // eslint-disable-next-line react-hooks/purity
      new Date(assignment.expiresAt).getTime() - Date.now() < 7 * 86400000
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
        membershipStatus={membershipStatus}
      />
    </AppShell>
  )
}
