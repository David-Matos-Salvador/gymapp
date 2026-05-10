import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { DashboardCards } from "@/components/dashboard/cards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Clock } from "lucide-react"
import Link from "next/link"

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

  if (user.role === "MEMBER" && !user.onboardingCompleted) {
    redirect("/onboarding")
  }

  if (user.role === "ADMIN") {
    redirect("/admin")
  }

  if (user.role === "TRAINER") {
    redirect("/coach")
  }

  const streak = calculateStreak(user.workoutLogs)
  const totalWorkouts = await prisma.workoutLog.count({ where: { userId: user.id } })

  const assignedRoutine = await prisma.routine.findFirst({
    where: { assignedToId: user.id },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const serializedAssignedRoutine = assignedRoutine
    ? {
        id: assignedRoutine.id,
        name: assignedRoutine.name,
        description: assignedRoutine.description,
        exercises: assignedRoutine.exercises.map((e) => ({
          id: e.exercise.id,
          name: e.exercise.name,
          muscleGroup: e.exercise.muscleGroup,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restSeconds: e.restSeconds,
        })),
      }
    : null

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

        {serializedAssignedRoutine && (
          <Card className="border-2 border-gym-green/20 bg-gradient-to-r from-gym-green/[0.03] to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Dumbbell className="h-5 w-5 text-gym-green" />
                Mi entrenamiento de hoy
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-xl">{serializedAssignedRoutine.name}</h3>
                  {serializedAssignedRoutine.description && (
                    <p className="text-sm text-muted-foreground">{serializedAssignedRoutine.description}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                {serializedAssignedRoutine.exercises.slice(0, 5).map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gym-green/10 text-xs font-bold text-gym-green">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{ex.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {ex.sets}x{ex.reps}
                      {ex.weight > 0 && ` · ${ex.weight}kg`}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {ex.restSeconds}s
                    </span>
                  </div>
                ))}
                {serializedAssignedRoutine.exercises.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-2">
                    +{serializedAssignedRoutine.exercises.length - 5} ejercicios más
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Link
                  href={`/workout/log/${serializedAssignedRoutine.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-gym-green hover:underline"
                >
                  <Dumbbell className="h-4 w-4" />
                  Iniciar entrenamiento
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
