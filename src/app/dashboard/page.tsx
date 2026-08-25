import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import {
  getWeeklyProgress,
  getWeeklyStreak,
  getWorkoutsThisWeek,
  getNextPropuestoSplit,
} from "@/lib/weekly-progress"
import { MemberDashboard } from "@/components/dashboard/member-dashboard"
import { CoachDashboard } from "@/components/coach/coach-dashboard"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      role: true,
      name: true,
      gymId: true,
      onboardingCompleted: true,
      assignedTrainerId: true,
      trainingFrequency: true,
    },
  })

  if (!user) redirect("/login")
  if (user.role === "MEMBER" && !user.onboardingCompleted) redirect("/onboarding")

  if (user.role === "MEMBER") {
    const frequency = user.trainingFrequency ?? 3

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { endDate: "desc" },
      include: { plan: { select: { name: true } } },
    })

    const [weeklyProgress, weeklyStreakData, workoutDates, assignedTrainer, trainerRequest] =
      await Promise.all([
        getWeeklyProgress(user.id, frequency),
        getWeeklyStreak(user.id, frequency),
        getWorkoutsThisWeek(user.id),
        user.assignedTrainerId
          ? prisma.user.findUnique({
              where: { id: user.assignedTrainerId },
              select: { name: true },
            })
          : Promise.resolve(null),
        prisma.trainerRequest.findFirst({
          where: {
            clientId: user.id,
            status: { in: ["PENDING", "ACCEPTED"] },
          },
          orderBy: { createdAt: "desc" },
          include: { trainer: { select: { name: true, id: true } } },
        }),
      ])

    const assignment = await prisma.assignedRoutinePlan.findFirst({
      where: { userId: user.id, active: true },
      include: {
        plan: {
          include: {
            splits: { orderBy: { order: "asc" }, select: { id: true, label: true, name: true } },
          },
        },
      },
    })

    let nextSplitName: string | null = null
    if (assignment?.plan) {
      const propuestoSplitId = await getNextPropuestoSplit(user.id, assignment.plan.id)
      if (propuestoSplitId) {
        const split = assignment.plan.splits.find((s) => s.id === propuestoSplitId)
        nextSplitName = split ? `${split.label}: ${split.name}` : null
      }
    }

    const now = new Date()

    const weekBookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        status: "CONFIRMED",
      },
      include: {
        classItem: {
          select: {
            name: true,
            dayOfWeek: true,
            startTime: true,
            duration: true,
            trainer: { select: { name: true } },
          },
        },
      },
      orderBy: [{ classItem: { dayOfWeek: "asc" } }, { classItem: { startTime: "asc" } }],
      take: 10,
    })

    const membershipEndDate = membership ? new Date(membership.endDate) : null
    const nowTime = now.getTime()
    const daysRemaining =
      membershipEndDate ? Math.ceil((membershipEndDate.getTime() - nowTime) / 86400000) : null

    const isExpiredMembership =
      membership
        ? membership.status === "EXPIRED" ||
          (membership.status === "ACTIVE" && membershipEndDate !== null && membershipEndDate < new Date())
        : false

    const effectiveStatus = isExpiredMembership ? "EXPIRED" : (membership?.status ?? "ACTIVE")

    const hasCoach = !!trainerRequest?.trainer || !!assignedTrainer
    const coachName =
      trainerRequest?.trainer?.name ?? assignedTrainer?.name ?? null

    return (
      <AppShell>
        <MemberDashboard
          userName={user.name?.split(" ")[0] ?? "Atleta"}
          membership={
            membership
              ? {
                  status: effectiveStatus,
                  planName: membership.plan.name,
                  endDate: membership.endDate.toISOString(),
                  daysRemaining,
                  isExpiring: daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && effectiveStatus === "ACTIVE",
                }
              : null
          }
          weeklyProgress={{
            completed: weeklyProgress.completed,
            target: weeklyProgress.target,
            percent: weeklyProgress.percent,
          }}
          weeklyStreak={{
            streak: weeklyStreakData.streak,
            bestStreak: weeklyStreakData.bestStreak,
          }}
          workoutDates={workoutDates.map((d) => d.toISOString())}
          nextWorkout={
            assignment?.plan
              ? {
                  planName: assignment.plan.name,
                  splitName: nextSplitName,
                  planId: assignment.plan.id,
                }
              : null
          }
          bookings={weekBookings.map((b) => ({
            id: b.id,
            className: b.classItem.name,
            dayOfWeek: b.classItem.dayOfWeek,
            startTime: b.classItem.startTime,
            duration: b.classItem.duration,
            trainerName: b.classItem.trainer.name,
          }))}
          coach={{
            hasCoach: !!hasCoach,
            coachName,
            hasPendingRequest: !hasCoach && !!trainerRequest && trainerRequest.status === "PENDING",
            requestStatus: trainerRequest?.status ?? null,
          }}
        />
      </AppShell>
    )
  }

  if (user.role === "TRAINER") {
    const clients = await prisma.user.findMany({
      where: { assignedTrainerId: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        objective: true,
        experienceLevel: true,
        onboardingCompleted: true,
        memberShips: { include: { plan: true }, where: { status: "ACTIVE" }, take: 1 },
      },
      orderBy: { name: "asc" },
    })

    const plans = await prisma.routinePlan.findMany({
      where: { userId: user.id },
      include: { splits: { include: { exercises: true } } },
      orderBy: { updatedAt: "desc" },
    })

    const classes = await prisma.class.findMany({
      where: { trainerId: user.id },
      include: { bookings: { where: { status: "CONFIRMED" } } },
      orderBy: { startTime: "asc" },
    })

    const now = new Date()
    const activeMemberships = clients.filter((c) =>
      c.memberShips.some((m) => m.status === "ACTIVE" && new Date(m.endDate) > now)
    ).length
    const upcomingClasses = classes.length

    return (
      <AppShell>
        <CoachDashboard
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            objective: c.objective,
            experienceLevel: c.experienceLevel,
            onboardingCompleted: c.onboardingCompleted,
            hasActiveMembership: c.memberShips.some(
              (m) => m.status === "ACTIVE" && new Date(m.endDate) > now
            ),
            membershipPlan: c.memberShips[0]?.plan?.name ?? null,
          }))}
          routines={plans.map((p) => ({
            id: p.id,
            name: p.name,
            exerciseCount: p.splits.reduce((sum, s) => sum + s.exercises.length, 0),
          }))}
          classes={classes.map((c) => ({
            id: c.id,
            name: c.name,
            dayOfWeek: c.dayOfWeek,
            startTime: c.startTime,
            duration: c.duration,
            capacity: c.capacity,
            bookingsCount: c.bookings.length,
          }))}
          stats={{
            totalClients: clients.length,
            activeMemberships,
            upcomingClasses,
            totalRoutines: plans.length,
          }}
        />
      </AppShell>
    )
  }

  if (user.role === "ADMIN") {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)

    const [totalActiveMemberships, monthMemberships, newMembersThisMonth, weeklyCheckIns,
      expiringMemberships, recentCheckIns, gymData, recentWorkouts] = await Promise.all([
      prisma.membership.count({
        where: { status: "ACTIVE", endDate: { gt: now } },
      }),
      prisma.membership.findMany({
        where: {
          paymentConfirmed: true,
          startDate: { gte: startOfMonth },
        },
        include: { plan: { select: { price: true } } },
      }),
      prisma.user.count({
        where: {
          role: { in: ["MEMBER", "TRAINER"] },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.checkIn.count({
        where: { date: { gte: startOfWeek } },
      }),
      prisma.membership.findMany({
        where: {
          status: "ACTIVE",
          endDate: { gt: now, lte: nextWeek },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { name: true } },
        },
        orderBy: { endDate: "asc" },
        take: 20,
      }),
      prisma.checkIn.findMany({
        orderBy: { date: "desc" },
        take: 20,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      user.gymId
        ? prisma.gym.findUnique({
            where: { id: user.gymId },
            select: {
              name: true,
              _count: { select: { users: true } },
            },
          })
        : Promise.resolve(null),
      prisma.workoutLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          createdAt: true,
          userId: true,
          user: { select: { name: true } },
          split: { select: { name: true, plan: { select: { name: true } } } },
        },
      }),
    ])

    const monthlyIncome = monthMemberships.reduce((sum, m) => sum + m.plan.price, 0)
    const avgDailyAttendance = Math.round((weeklyCheckIns / 7) * 10) / 10

    const activeEquipment = user.gymId
      ? await prisma.gymEquipmentActivation.count({
          where: { gymId: user.gymId, active: true },
        })
      : 0

    const activeExercises = user.gymId
      ? await prisma.gymExercise.count({
          where: { gymId: user.gymId, active: true },
        })
      : 0

    const customEquipment = user.gymId
      ? await prisma.gymEquipment.count({
          where: { gymId: user.gymId },
        })
      : 0

    const totalMembers = user.gymId
      ? await prisma.user.count({ where: { gymId: user.gymId } })
      : 0

    const pendingPayments = user.gymId
      ? await prisma.payment.count({
          where: { status: "PENDING", user: { gymId: user.gymId } },
        })
      : await prisma.payment.count({ where: { status: "PENDING" } })

    return (
      <AppShell>
        <AdminDashboard
          gymName={gymData?.name ?? null}
          stats={{
            totalActiveMemberships,
            monthlyIncome,
            newMembersThisMonth,
            avgDailyAttendance,
            totalMembers,
            activeEquipment: activeEquipment + customEquipment,
            activeExercises,
            pendingPayments,
          }}
          expiringMemberships={expiringMemberships.map((m) => ({
            id: m.id,
            userName: m.user.name ?? m.user.email,
            planName: m.plan.name,
            endDate: m.endDate.toISOString(),
          }))}
          recentCheckIns={recentCheckIns.map((c) => ({
            id: c.id,
            userName: c.user.name ?? c.user.email,
            date: c.date.toISOString(),
          }))}
          recentWorkouts={recentWorkouts.map((w) => ({
            id: w.userId,
            planName: w.split?.plan?.name ?? w.split?.name ?? "Entrenamiento",
            userName: w.user.name ?? "Usuario",
            date: w.createdAt.toISOString(),
          }))}
        />
      </AppShell>
    )
  }

  if (user.role === "SUPER_ADMIN") {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [totalGyms, totalUsers, activeMemberships, totalTrainers, todayCheckins,
      revenueAgg, gyms, recentUsers] = await Promise.all([
      prisma.gym.count(),
      prisma.user.count(),
      prisma.membership.count({ where: { status: "ACTIVE", endDate: { gt: now } } }),
      prisma.user.count({ where: { role: "TRAINER" } }),
      prisma.checkIn.count({ where: { date: { gte: todayStart } } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED", type: "MEMBERSHIP" },
        _sum: { amount: true },
      }),
      prisma.gym.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true, gymId: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ])

    return (
      <AppShell>
        <SuperAdminDashboard
          stats={{
            totalGyms,
            totalUsers,
            activeMemberships,
            todayCheckins,
            totalTrainers,
            totalRevenue: revenueAgg._sum.amount ?? 0,
          }}
          gyms={gyms.map((g) => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            active: g.active,
            showMachineNumbers: g.showMachineNumbers ?? false,
            userCount: g._count.users,
          }))}
          recentUsers={recentUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt.toISOString(),
            gymId: u.gymId,
          }))}
        />
      </AppShell>
    )
  }

  redirect("/login")
}
