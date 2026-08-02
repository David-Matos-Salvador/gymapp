"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DAY_OF_WEEK_LABELS } from "@/constants/ui"
import {
  Flame,
  Dumbbell,
  CalendarDays,
  ArrowRight,
  Clock,
  UserCheck,
  AlertTriangle,
  Trophy,
  Target,
} from "lucide-react"

const DAY_LABELS = DAY_OF_WEEK_LABELS

interface MembershipInfo {
  status: string
  planName: string
  endDate: string | null
  daysRemaining: number | null
  isExpiring: boolean
}

interface WeeklyProgress {
  completed: number
  target: number
  percent: number
}

interface WeeklyStreak {
  streak: number
  bestStreak: number
}

interface NextWorkout {
  planName: string
  splitName: string | null
  planId: string
}

interface BookingItem {
  id: string
  className: string
  dayOfWeek: string
  duration: number
  trainerName: string | null
}

interface CoachInfo {
  hasCoach: boolean
  coachName: string | null
  hasPendingRequest: boolean
  requestStatus: string | null
}

interface MemberDashboardProps {
  userName: string
  membership: MembershipInfo | null
  weeklyProgress: WeeklyProgress
  weeklyStreak: WeeklyStreak
  workoutDates: string[]
  nextWorkout: NextWorkout | null
  bookings: BookingItem[]
  coach: CoachInfo
}

export function MemberDashboard({
  userName,
  membership,
  weeklyProgress,
  weeklyStreak,
  workoutDates,
  nextWorkout,
  bookings,
  coach,
}: MemberDashboardProps) {
  const progressPercent = Math.min(weeklyProgress.percent, 100)

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Hola, {userName}
        </h1>
        <p className="text-muted-foreground">Resumen de tu actividad</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="hover:shadow-md transition-all border-t-2 border-t-accent-yellow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Racha semanal</CardTitle>
                <Flame className="h-4 w-4 text-accent-yellow" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold">{weeklyStreak.streak}</p>
                <p className="text-sm text-muted-foreground">semanas</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mejor: {weeklyStreak.bestStreak} semanas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Link href="/rutinas">
            <Card className="hover:shadow-md transition-all border-t-2 border-t-accent-yellow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Esta semana</CardTitle>
                  <Dumbbell className="h-4 w-4 text-accent-yellow" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold">{weeklyProgress.completed}</p>
                  <p className="text-sm text-muted-foreground">/ {weeklyProgress.target}</p>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-accent-yellow transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {progressPercent >= 100 ? "Objetivo cumplido" : `${progressPercent}% completado`}
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="hover:shadow-md transition-all border-t-2 border-t-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Membresía</CardTitle>
                {membership?.status === "ACTIVE" ? (
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {membership ? (
                <>
                  <Badge
                    variant={membership.status === "ACTIVE" ? "default" : "destructive"}
                    className={
                      membership.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : ""
                    }
                  >
                    {membership.status === "ACTIVE" ? "Activa" : membership.status === "EXPIRED" ? "Expirada" : membership.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1.5">{membership.planName}</p>
                  {membership.daysRemaining !== null && membership.daysRemaining > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {membership.isExpiring ? "Vence en " : "Restan "}
                      <span className="font-medium text-accent-yellow">{membership.daysRemaining} días</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sin membresía activa</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="hover:shadow-md transition-all border-t-2 border-t-accent-yellow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Coach</CardTitle>
                <UserCheck className="h-4 w-4 text-accent-yellow" />
              </div>
            </CardHeader>
            <CardContent>
              {coach.hasCoach ? (
                <>
                  <p className="text-sm font-medium">{coach.coachName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Entrenador asignado</p>
                </>
              ) : coach.hasPendingRequest ? (
                <>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" /> {coach.requestStatus === "PENDING" ? "Pendiente" : coach.requestStatus}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Solicitud enviada</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sin entrenador asignado</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent-yellow" /> Próximo entrenamiento
              </CardTitle>
              {nextWorkout && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/rutinas?planId=${nextWorkout.planId}`}>
                    Ir a rutina <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {nextWorkout ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{nextWorkout.planName}</p>
                  {nextWorkout.splitName ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Dumbbell className="h-4 w-4 text-accent-yellow" />
                      <span className="text-muted-foreground">Siguiente split:</span>
                      <span className="font-medium">{nextWorkout.splitName}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Rutina asignada — sin splits definidos</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    <span>
                      {workoutDates.length > 0
                        ? `${weeklyProgress.completed} de ${weeklyProgress.target} completados esta semana`
                        : "Aún no has entrenado esta semana"}
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyState message="No tienes una rutina asignada" className="py-4" />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-accent-yellow" /> Próximas clases
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/classes">
                  Ver todas <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookings.length === 0 ? (
                <EmptyState message="No tienes clases reservadas esta semana" className="py-4" />
              ) : (
                bookings.map((booking, i) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10">
                        <CalendarDays className="h-5 w-5 text-accent-yellow" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{booking.className}</p>
                        <p className="text-xs text-muted-foreground">
                          {DAY_LABELS[booking.dayOfWeek] ?? booking.dayOfWeek} · {booking.duration}min · {booking.trainerName ?? "Coach"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/20 bg-emerald-500/5 shrink-0">
                        Confirmada
                      </Badge>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/rutinas">
            <Card className="hover:shadow-md transition-all border-t-2 border-t-accent-yellow cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10">
                  <Dumbbell className="h-5 w-5 text-accent-yellow" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Mi Rutina</p>
                  <p className="text-xs text-muted-foreground">Ver plan de entrenamiento</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/progress">
            <Card className="hover:shadow-md transition-all border-t-2 border-t-accent-yellow cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10">
                  <Trophy className="h-5 w-5 text-accent-yellow" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Progreso</p>
                  <p className="text-xs text-muted-foreground">Estadísticas e historial</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/classes">
            <Card className="hover:shadow-md transition-all border-t-2 border-t-primary cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Clases</p>
                  <p className="text-xs text-muted-foreground">Reservar clase grupal</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
