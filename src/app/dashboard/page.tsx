import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { DashboardCards } from "@/components/dashboard/cards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Sparkles, Clock } from "lucide-react"
import Link from "next/link"
import { getWeeklyStreak } from "@/lib/weekly-progress"

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "B\u00edceps",
  TRICEPS: "Tr\u00edceps", LEGS: "Piernas", GLUTES: "Gl\u00fateos", ABS: "Abdominales",
  CALVES: "Pantorrillas", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
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

  const totalWorkouts = await prisma.workoutLog.count({ where: { userId: user.id } })

  const assignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true },
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

  const frequency = assignment?.plan?.frequency ?? 3
  const weeklyStreakData = await getWeeklyStreak(user.id, frequency)

  let propuestoSplit: {
    id: string
    label: string
    name: string
    muscleGroups: string[]
    exerciseCount: number
    estimatedDuration: number | null
  } | null = null

  if (assignment?.plan) {
    const splits = assignment.plan.splits
    const lastLog = await prisma.workoutLog.findFirst({
      where: { userId: user.id, split: { planId: assignment.plan.id } },
      orderBy: { createdAt: "desc" },
      include: { split: { select: { order: true } } },
    })

    const lastComplete = lastLog?.split ?? null
    const lastIndex = lastComplete ? splits.findIndex((s) => s.order === lastComplete.order) : -1
    const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % splits.length
    const split = splits[nextIndex]

    propuestoSplit = {
      id: split.id,
      label: split.label,
      name: split.name,
      muscleGroups: split.muscleGroups,
      exerciseCount: split.exercises.length,
      estimatedDuration: split.estimatedDuration,
    }
  }

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
          <p className="text-muted-foreground">Tu progreso</p>
        </div>

        <DashboardCards
          totalWorkouts={totalWorkouts}
          weeklyStreak={weeklyStreakData.streak}
          classesCount={user.bookings.length}
          bookings={serializedBookings}
        />

        {propuestoSplit && (
          <Card className="border-2 border-gym-amber/20 bg-gradient-to-r from-gym-amber/[0.03] to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-gym-amber" />
                Próximo entrenamiento
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href={`/workout/log/${propuestoSplit.id}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-gym-amber/30 transition-all hover:shadow-md"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gym-amber/10 text-gym-amber font-bold text-xl">
                  {propuestoSplit.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{propuestoSplit.name}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gym-amber/10 px-2 py-0.5 text-[10px] font-semibold text-gym-amber">
                      <Sparkles className="h-2.5 w-2.5" /> Propuesto
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {propuestoSplit.muscleGroups.map((g) => MUSCLE_LABELS[g] ?? g).join(" · ")}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {propuestoSplit.exerciseCount} ejercicios
                    </span>
                    {propuestoSplit.estimatedDuration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{propuestoSplit.estimatedDuration} min
                      </span>
                    )}
                  </div>
                </div>
                <Dumbbell className="h-5 w-5 text-gym-amber shrink-0" />
              </Link>

              <div className="mt-3">
                <Link
                  href="/rutina"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gym-amber hover:underline"
                >
                  <Dumbbell className="h-4 w-4" />
                  Ver Mi Rutina completa
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!propuestoSplit && (
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="py-8 text-center space-y-3">
              <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No tienes una rutina asignada.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1 text-sm font-medium text-gym-green hover:underline"
              >
                Configurar mi rutina
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
