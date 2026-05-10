import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dumbbell, Clock, Play, Flame, Zap } from "lucide-react"
import Link from "next/link"
import { MiniProgressSection } from "@/components/rutina/mini-progress-section"

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

const muscleGroupLabels: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "Bíceps",
  TRICEPS: "Tríceps", LEGS: "Piernas", GLUTES: "Glúteos", ABS: "Abdomen",
  CALVES: "Gemelos", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

export default async function RutinaPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workoutLogs: { orderBy: { date: "desc" }, take: 7 },
    },
  })

  if (!user) redirect("/login")
  if (user.role !== "MEMBER") {
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") redirect("/admin")
    if (user.role === "TRAINER") redirect("/coach")
  }

  if (!user.onboardingCompleted) redirect("/onboarding")

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

  if (!assignedRoutine) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-4 py-12 text-center space-y-4">
          <Dumbbell className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h2 className="text-xl font-bold">Sin rutina asignada</h2>
          <p className="text-sm text-muted-foreground">
            No tenés una rutina personalizada asignada. Podés crear una desde el panel de onboarding.
          </p>
          <Link href="/onboarding">
            <Button className="rounded-xl">
              <Zap className="mr-2 h-4 w-4" />
              Genera tu rutina personalizada
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const streak = calculateStreak(user.workoutLogs)
  const totalWorkouts = await prisma.workoutLog.count({ where: { userId: user.id } })

  const totalDuration = Math.round(
    assignedRoutine.exercises.reduce((acc, e) => acc + e.sets * (e.restSeconds + 45), 0) / 60
  )

  

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-4 py-6 pb-24 space-y-5">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.75rem] font-bold tracking-tight">
            Hola, {user.name?.split(" ")[0] ?? "Atleta"}
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Card className="bg-gym-orange/5 border-gym-orange/10 py-3">
            <CardContent className="p-0 text-center">
              <Flame className="h-5 w-5 text-gym-orange mx-auto mb-0.5" />
              <p className="text-xl font-bold tabular-nums">{streak}</p>
              <p className="text-[10px] text-muted-foreground">Racha</p>
            </CardContent>
          </Card>
          <Card className="bg-gym-violet/5 border-gym-violet/10 py-3">
            <CardContent className="p-0 text-center">
              <Dumbbell className="h-5 w-5 text-gym-violet mx-auto mb-0.5" />
              <p className="text-xl font-bold tabular-nums">{totalWorkouts}</p>
              <p className="text-[10px] text-muted-foreground">Entrenos</p>
            </CardContent>
          </Card>
          <Card className="bg-gym-green/5 border-gym-green/10 py-3">
            <CardContent className="p-0 text-center">
              <Clock className="h-5 w-5 text-gym-green mx-auto mb-0.5" />
              <p className="text-xl font-bold tabular-nums">{totalDuration}m</p>
              <p className="text-[10px] text-muted-foreground">Minutos</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dumbbell className="h-5 w-5 text-primary" />
              {assignedRoutine.name}
            </CardTitle>
            {assignedRoutine.description && (
              <p className="text-xs text-muted-foreground">{assignedRoutine.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {assignedRoutine.exercises.map((ex, i) => (
              <div
                key={ex.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 min-h-[52px] hover:border-primary/30 transition-colors"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ex.exercise.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {muscleGroupLabels[ex.exercise.muscleGroup] ?? ex.exercise.muscleGroup}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">
                    {ex.sets}×{ex.reps}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {ex.weight > 0 ? `${ex.weight} kg` : "peso corp."}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{ex.restSeconds}s</p>
                </div>
              </div>
            ))}

            <Link href={`/workout/log/${assignedRoutine.id}`} className="block pt-2">
              <Button className="w-full h-12 rounded-xl text-base shadow-lg shadow-primary/25">
                <Play className="mr-2 h-5 w-5" />
                Iniciar entrenamiento
              </Button>
            </Link>
          </CardContent>
        </Card>

        <MiniProgressSection />
      </div>
    </AppShell>
  )
}
