import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock, Dumbbell, History } from "lucide-react"

interface PageProps {
  params: Promise<{ planId: string }>
}

export default async function HistorialPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  })
  if (!user) redirect("/login")

  const { planId } = await params

  const [assignment, plan, logs] = await Promise.all([
    prisma.assignedRoutinePlan.findFirst({
      where: { userId: user.id, planId, active: true },
      select: { id: true },
    }),
    prisma.routinePlan.findUnique({
      where: { id: planId },
      select: { name: true },
    }),
    prisma.workoutLog.findMany({
      where: { userId: user.id, split: { planId } },
      include: {
        split: { select: { label: true, name: true } },
        sets: { orderBy: [{ exerciseName: "asc" }, { setNumber: "asc" }] },
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ])

  if (!assignment || !plan) redirect("/rutinas")

  const records = new Map<string, { weight: number; logId: string }>()
  for (const log of [...logs].reverse()) {
    for (const set of log.sets) {
      const current = records.get(set.exerciseName)
      if (!current || set.weight > current.weight) {
        records.set(set.exerciseName, { weight: set.weight, logId: log.id })
      }
    }
  }

  return (
    <AppShell>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6 md:py-8">
        <Breadcrumb
          items={[{ label: "Rutina", href: `/rutinas/${planId}` }, { label: "Historial" }]}
          className="px-0 pb-1"
        />

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <History className="h-6 w-6 text-accent-yellow" />
            Historial de entrenamientos
          </h1>
          <p className="text-muted-foreground">{plan.name}</p>
        </div>

        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Todavía no registraste entrenamientos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Completa una rutina y finalízala para verla aquí.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const totalSets = log.sets.length
              const exercises = [...new Set(log.sets.map((set) => set.exerciseName))]
              const volume = log.sets.reduce((sum, set) => sum + set.reps * set.weight, 0)
              return (
                <Card key={log.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {log.split
                            ? `${log.split.label} · ${log.split.name}`
                            : "Entrenamiento libre"}
                        </CardTitle>
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {log.date.toLocaleDateString("es-PE", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.duration ?? 0} min
                          </span>
                          <span>
                            {totalSets} series · {exercises.length} ejercicios
                          </span>
                        </p>
                      </div>
                      <Badge variant="secondary">{Math.round(volume)} kg volumen</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {exercises.map((name) => {
                      const sets = log.sets.filter((set) => set.exerciseName === name)
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-lg border px-3 py-2"
                        >
                          <span className="flex items-center gap-1.5 text-sm">
                            {name}
                            {records.get(name)?.logId === log.id &&
                              (records.get(name)?.weight ?? 0) > 0 && (
                                <Badge className="bg-accent-yellow/15 text-accent-yellow text-[11px]">
                                  PR
                                </Badge>
                              )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {sets.length} series ·{" "}
                            {sets.map((set) => `${set.reps}×${set.weight}kg`).join(", ")}
                          </span>
                        </div>
                      )
                    })}
                    {log.notes && (
                      <p className="pt-1 text-xs text-muted-foreground">Nota: {log.notes}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
