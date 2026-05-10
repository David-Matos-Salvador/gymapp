"use client"

import { useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dumbbell, Plus, ArrowRight, Clock, GripVertical } from "lucide-react"

interface BaseRoutine {
  id: string
  name: string
  description?: string | null
  exerciseCount: number
  muscleGroups: string[]
  totalDuration?: number
}

interface RoutinesListProps {
  routines: BaseRoutine[]
  isCoach: boolean
  recommended?: boolean
}

const muscleGroupLabels: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "Bíceps",
  TRICEPS: "Tríceps", LEGS: "Piernas", GLUTES: "Glúteos", ABS: "Abdominales",
  CALVES: "Pantorrillas", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

export function RoutinesList({ routines, isCoach, recommended }: RoutinesListProps) {
  const { play } = useSound()

  return (
    <div className="space-y-6">
      {isCoach && !recommended && (
        <Button asChild onClick={() => play("click")}>
          <Link href="/routines/new">
            <Plus className="mr-2 h-4 w-4" /> Crear rutina
          </Link>
        </Button>
      )}

      {routines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">No hay rutinas</p>
              <p className="text-sm text-muted-foreground mt-1">
                {recommended
                  ? "No hay rutinas recomendadas disponibles"
                  : isCoach
                    ? "Crea tu primera rutina para tus atletas"
                    : "Tu coach aún no te ha asignado rutinas"}
              </p>
            </div>
            {isCoach && !recommended && (
              <Button asChild onClick={() => play("success")}>
                <Link href="/routines/new">
                  <Plus className="mr-2 h-4 w-4" /> Crear rutina
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((routine, i) => (
            <motion.div
              key={routine.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link href={`/routines/${routine.id}`} onClick={() => play("select")}>
                <Card className={`h-full hover:shadow-md transition-all hover:border-primary/40 group cursor-pointer ${recommended ? "ring-1 ring-gym-violet/20" : ""}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{routine.name}</CardTitle>
                      {recommended && (
                        <span className="text-[10px] bg-gym-violet/10 text-gym-violet px-1.5 py-0.5 rounded-full">Popular</span>
                      )}
                    </div>
                    {routine.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{routine.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {routine.exerciseCount} ejercicios
                      </span>
                      {routine.totalDuration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />~{routine.totalDuration}min
                        </span>
                      )}
                    </div>
                    {routine.muscleGroups.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {routine.muscleGroups.slice(0, 4).map((group) => (
                          <span
                            key={group}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                          >
                            {muscleGroupLabels[group] ?? group}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
