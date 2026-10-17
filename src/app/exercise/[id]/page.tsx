import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Dumbbell, ChevronLeft, Play, Clock, Calendar } from "lucide-react"
import Link from "next/link"

const humanizeEnum = (val: string) => val.charAt(0) + val.slice(1).toLowerCase().replace(/_/g, " ")

const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?&]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) redirect("/login")

  const { id } = await params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/exercises/${id}`, { cache: "no-store" })

  if (res.status === 404) notFound()
  if (!res.ok) throw new Error("Error al cargar el ejercicio")

  const exercise = await res.json()

  const recentLogs = await prisma.workoutSetLog.findMany({
    where: { exerciseId: id, workoutLog: { userId: user.id } },
    include: { workoutLog: { select: { date: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  const sessionsMap = new Map<string, { date: Date; logs: typeof recentLogs }>()
  for (const log of recentLogs) {
    const key = log.workoutLog.date.toISOString()
    if (!sessionsMap.has(key)) {
      sessionsMap.set(key, { date: new Date(log.workoutLog.date), logs: [] })
    }
    sessionsMap.get(key)!.logs.push(log)
  }
  const sessions = Array.from(sessionsMap.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )

  const uniquePlans = new Map<string, { id: string; name: string }>()
  for (const se of exercise.splitExercises ?? []) {
    const plan = se.split?.plan
    if (plan && !uniquePlans.has(plan.id)) {
      uniquePlans.set(plan.id, { id: plan.id, name: plan.name })
    }
  }

  const youtubeId = exercise.videoUrl ? extractYoutubeId(exercise.videoUrl) : null

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <Link
          href="/routines/new"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {exercise.imageUrl ? (
            <div className="shrink-0 relative w-full sm:w-64 h-48">
              <Image
                src={exercise.imageUrl}
                alt={exercise.name}
                fill
                className="rounded-xl object-cover shadow-sm ring-1 ring-border"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center shrink-0 rounded-xl bg-muted/50 w-full sm:w-64 h-48 ring-1 ring-border">
              <Dumbbell className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{exercise.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{humanizeEnum(exercise.muscleGroup)}</Badge>
                <Badge variant="outline">{humanizeEnum(exercise.equipment)}</Badge>
              </div>
            </div>

            {exercise.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {exercise.description}
              </p>
            )}

            <Button size="sm" variant="outline" className="w-fit" asChild>
              <Link href="/routines/new">+ Agregar a una rutina</Link>
            </Button>
          </div>
        </div>

        {youtubeId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                Video demostrativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden ring-1 ring-border">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title={`Video de ${exercise.name}`}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {uniquePlans.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Rutinas que incluyen este ejercicio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y -mx-4">
                {Array.from(uniquePlans.values()).map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/routines/${plan.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{plan.name}</span>
                    <ChevronLeft className="h-3 w-3 text-muted-foreground ml-auto rotate-180" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historial reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin registros recientes para este ejercicio
              </p>
            ) : (
              <div className="space-y-4">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.date.toISOString()} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {session.date.toLocaleDateString("es-MX", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <div className="space-y-1">
                      {session.logs.map((log) => (
                        <div
                          key={log.id}
                          className="grid grid-cols-3 text-sm text-muted-foreground pl-4"
                        >
                          <span>Serie {log.setNumber}</span>
                          <span>
                            {log.reps} {log.reps === 1 ? "rep" : "reps"}
                          </span>
                          <span className="text-right">
                            {log.weight > 0 ? `${log.weight} kg` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
