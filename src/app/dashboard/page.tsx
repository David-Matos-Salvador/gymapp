import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { DashboardCards } from "@/components/dashboard/cards"

function calculateStreak(logs: { date: Date }[]) {
  if (logs.length === 0) return 0
  let streak = 0
  const checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)

  const daysWithWorkouts = new Set(
    logs.map((log) => {
      const d = new Date(log.date)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    })
  )

  while (daysWithWorkouts.has(checkDate.toISOString())) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      routines: {
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      },
      workoutLogs: {
        orderBy: { date: "desc" },
        take: 7,
      },
      bookings: {
        include: {
          classItem: {
            include: { trainer: { select: { name: true } } },
          },
        },
        where: { status: "CONFIRMED" },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role === "ADMIN") {
    redirect("/admin")
  }

  if (user.role === "TRAINER") {
    redirect("/coach")
  }

  const streak = calculateStreak(user.workoutLogs)
  const totalWorkouts = await prisma.workoutLog.count({ where: { userId: user.id } })

  const serializedRoutines = user.routines.map((r) => ({
    id: r.id,
    name: r.name,
    exercises: r.exercises.map((e) => ({
      exercise: {
        name: e.exercise.name,
        muscleGroup: e.exercise.muscleGroup,
      },
    })),
  }))

  const serializedBookings = user.bookings.map((b) => ({
    id: b.id,
    classItem: {
      id: b.classItem.id,
      name: b.classItem.name,
      schedule: b.classItem.schedule.toISOString(),
      dayOfWeek: b.classItem.dayOfWeek,
      duration: b.classItem.duration,
      trainer: { name: b.classItem.trainer.name },
    },
  }))

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Bienvenido, {user.name?.split(" ")[0] ?? "Atleta"}
          </h1>
          <p className="text-muted-foreground">Tu progreso hoy</p>
        </div>

        <DashboardCards
          streak={streak}
          totalWorkouts={totalWorkouts}
          routinesCount={user.routines.length}
          classesCount={user.bookings.length}
          routines={serializedRoutines}
          bookings={serializedBookings}
        />
      </div>
    </AppShell>
  )
}
