"use client"

import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Flame,
  Dumbbell,
  CalendarDays,
  Trophy,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react"

interface Routine {
  id: string
  name: string
  exercises: { exercise: { name: string; muscleGroup: string } }[]
}

interface Booking {
  id: string
  classItem: {
    id: string
    name: string
    schedule: string
    dayOfWeek: string
    duration: number
    trainer: { name: string | null }
  }
}

interface DashboardCardsProps {
  streak: number
  totalWorkouts: number
  routinesCount: number
  classesCount: number
  routines: Routine[]
  bookings: Booking[]
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}

export function DashboardCards({ streak, totalWorkouts, routinesCount, classesCount, routines, bookings }: DashboardCardsProps) {
  const { play } = useSound()

  const daysOfWeek: Record<string, string> = {
    MONDAY: "lunes", TUESDAY: "martes", WEDNESDAY: "miércoles",
    THURSDAY: "jueves", FRIDAY: "viernes", SATURDAY: "sábado", SUNDAY: "domingo",
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card
            className="cursor-pointer hover:shadow-md transition-all border-t-2 border-t-gym-orange"
            onClick={() => play("hover")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Racha</CardTitle>
                <Flame className="h-4 w-4 text-gym-orange" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground mt-1">días seguidos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="cursor-pointer hover:shadow-md transition-all border-t-2 border-t-gym-green">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entrenamientos</CardTitle>
                <Dumbbell className="h-4 w-4 text-gym-green" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalWorkouts}</p>
              <p className="text-xs text-muted-foreground mt-1">total completados</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/routines" onClick={() => play("click")}>
            <Card className="hover:shadow-md transition-all border-t-2 border-t-gym-violet">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rutinas</CardTitle>
                  <Trophy className="h-4 w-4 text-gym-violet" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{routinesCount}</p>
                <p className="text-xs text-muted-foreground mt-1">planes activos</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Link href="/classes" onClick={() => play("click")}>
            <Card className="hover:shadow-md transition-all border-t-2 border-t-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clases</CardTitle>
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{classesCount}</p>
                <p className="text-xs text-muted-foreground mt-1">reservadas</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tus rutinas</CardTitle>
            <Button variant="ghost" size="sm" asChild onClick={() => play("click")}>
              <Link href="/routines">
                Ver todas <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {routines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tienes rutinas asignadas todavía
              </p>
            ) : (
              routines.map((routine, i) => (
                <motion.div
                  key={routine.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <Link
                    href={`/routines/${routine.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                    onClick={() => play("select")}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gym-green/10">
                      <Dumbbell className="h-5 w-5 text-gym-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{routine.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {routine.exercises.length} ejercicios
                        {routine.exercises.length > 0 &&
                          ` · ${routine.exercises.map((e) => e.exercise.muscleGroup).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(", ")}`}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximas clases</CardTitle>
            <Button variant="ghost" size="sm" asChild onClick={() => play("click")}>
              <Link href="/classes">
                Ver todas <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tienes clases reservadas
              </p>
            ) : (
              bookings.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gym-violet/10">
                      <CalendarDays className="h-5 w-5 text-gym-violet" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{booking.classItem.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {daysOfWeek[booking.classItem.dayOfWeek] ?? booking.classItem.dayOfWeek} · {booking.classItem.duration}min · {booking.classItem.trainer.name ?? "Coach"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gym-green">Confirmada</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
