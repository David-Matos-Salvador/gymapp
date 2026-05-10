"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Dumbbell, Clock, AlertTriangle } from "lucide-react"
import { WeeklyCalendar } from "@/components/rutina/weekly-calendar"
import { WeeklyProgress } from "@/components/rutina/weekly-progress"
import { SplitCard } from "@/components/rutina/split-card"
import { useWorkoutStore } from "@/stores/workout-store"

interface Split {
  id: string
  label: string
  name: string
  description: string | null
  muscleGroups: string[]
  exerciseCount: number
  estimatedDuration: number | null
  exerciseIds: string[]
}

interface RutinaClientProps {
  userName: string
  planName: string
  planDescription: string | null
  splits: Split[]
  propuestoSplitId: string | null
  expiresAt: string | null
  isExpiringSoon: boolean
  weeklyCompleted: number
  weeklyTarget: number
  workoutDates: string[]
  weeklyStreak: number
  bestStreak: number
}

export function RutinaClient({
  userName,
  planName,
  planDescription,
  splits,
  propuestoSplitId,
  expiresAt,
  isExpiringSoon,
  weeklyCompleted,
  weeklyTarget,
  workoutDates,
  weeklyStreak,
  bestStreak,
}: RutinaClientProps) {
  const router = useRouter()
  const inProgressState = useWorkoutStore()

  const completedSplitIds = new Set<string>()

  const dates = workoutDates.map((d) => new Date(d))

  const getDaysRemaining = () => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt).getTime() - Date.now()
    const days = Math.ceil(diff / 86400000)
    return days > 0 ? days : 0
  }

  const daysRemaining = getDaysRemaining()
  const handleSplitClick = (splitId: string) => {
    router.push(`/workout/log/${splitId}`)
  }

  const inProgressSplitId =
    inProgressState.splitId && inProgressState.phase !== "prepare" && inProgressState.phase !== "done"
      ? inProgressState.splitId
      : null

  return (
    <motion.div
      className="mx-auto max-w-lg px-4 py-6 pb-24 space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[1.75rem] font-bold tracking-tight">
          Hola, {userName}
        </h1>
        <p className="text-sm text-muted-foreground">{planName}</p>
      </div>

      {planDescription && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
          {planDescription}
        </p>
      )}

      {expiresAt && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
            isExpiringSoon
              ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          {isExpiringSoon ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
          <span>
            {isExpiringSoon
              ? `Expira en ${daysRemaining} día${daysRemaining !== 1 ? "s" : ""}`
              : `Vence ${new Date(expiresAt).toLocaleDateString("es-MX")}`}
          </span>
        </div>
      )}

      <div className="rounded-xl bg-muted/20 px-3 py-3">
        <WeeklyCalendar workoutDates={dates} />
      </div>

      <WeeklyProgress completed={weeklyCompleted} target={weeklyTarget} />

      {weeklyStreak > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-gym-orange/10 px-2.5 py-1 text-xs font-semibold text-gym-orange">
            🔥 {weeklyStreak} semana{weeklyStreak !== 1 ? "s" : ""} seguida{weeklyStreak !== 1 ? "s" : ""}
          </span>
          {bestStreak > weeklyStreak && (
            <span className="text-xs text-muted-foreground/60">
              (récord: {bestStreak})
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-gym-orange" />
          Mis entrenamientos
        </h2>

        {splits.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay entrenamientos en esta rutina.
          </p>
        )}

        {splits.map((split, i) => (
          <motion.div
            key={split.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <SplitCard
              id={split.id}
              label={split.label}
              name={split.name}
              description={split.description}
              muscleGroups={split.muscleGroups}
              exerciseCount={split.exerciseCount}
              estimatedDuration={split.estimatedDuration}
              isProposed={propuestoSplitId === split.id}
              isCompleted={completedSplitIds.has(split.id)}
              isInProgress={inProgressSplitId === split.id}
              completedExerciseCount={0}
              onClick={() => handleSplitClick(split.id)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
