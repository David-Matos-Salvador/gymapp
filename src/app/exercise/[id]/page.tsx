import type { Metadata } from "next"
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
import { MUSCLE_LABELS } from "@/constants/user"
import { EQUIPMENT_LABELS } from "@/constants/ui"

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

export const metadata: Metadata = {
  title: "Ejercicio",
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })
  if (!user) redirect("/login")

  const { id } = await params

  // Se lee directo de la base: un fetch a la API desde el servidor no lleva la sesión
  // y respondía 401, así que la página mostraba siempre «Algo salió mal» (#129).
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      muscleGroup: true,
      equipment: true,
      imageUrl: true,
      videoUrl: true,
    },
  })
  if (!exercise) notFound()

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

  const youtubeId = exercise.videoUrl ? extractYoutubeId(exercise.videoUrl) : null

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <Link
          href={user.role === "MEMBER" ? "/my-routine" : "/routines/new"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {user.role === "MEMBER" ? "Volver a mi rutina" : "Volver"}
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
                <Badge variant="secondary">
                  {MUSCLE_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup}
                </Badge>
                <Badge variant="outline">
                  {EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment}
                </Badge>
              </div>
            </div>

            {exercise.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {exercise.description}
              </p>
            )}

            {user.role !== "MEMBER" && (
              <Button size="sm" variant="outline" className="w-fit" asChild>
                <Link href="/routines/new">+ Agregar a una rutina</Link>
              </Button>
            )}
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
                      {session.date.toLocaleDateString("es-PE", {
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
