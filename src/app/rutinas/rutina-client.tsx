"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Dumbbell, Clock, AlertTriangle } from "lucide-react"
import { WeeklyCalendar } from "@/components/rutina/weekly-calendar"
import { WeeklyProgress } from "@/components/rutina/weekly-progress"
import { SplitCard } from "@/components/rutina/split-card"
import { useWorkoutStore } from "@/stores/workout-store"
import { Breadcrumb } from "@/components/layout/breadcrumb"

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
  planId: string
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
  membershipStatus: string
  membershipExpired: boolean
}

export function RutinaClient({
  userName,
  planId,
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
  membershipStatus,
  membershipExpired,
}: RutinaClientProps) {
  const router = useRouter()
  const inProgressState = useWorkoutStore()

  const dates = workoutDates.map((d) => new Date(d))

  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!expiresAt) return
    const compute = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      const days = Math.ceil(diff / 86400000)
      return days > 0 ? days : 0
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDaysRemaining(compute())
    const interval = setInterval(() => setDaysRemaining(compute()), 60000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const handleSplitClick = (splitId: string) => {
    const state = useWorkoutStore.getState()
    const hasActive = state.splitId && state.phase !== "prepare" && state.phase !== "done"
    const belongsToPlan = hasActive && splits.some((s) => s.id === state.splitId)

    if (belongsToPlan && state.splitId === splitId) {
      router.push(`/rutinas/${planId}/entrenar/${splitId}`)
      return
    }

    if (belongsToPlan && state.splitId !== splitId) {
      return
    }

    useWorkoutStore.getState().resetWorkout()
    router.push(`/rutinas/${planId}/entrenar/${splitId}`)
  }

  const inProgressSplitId =
    inProgressState.splitId && inProgressState.phase !== "prepare" && inProgressState.phase !== "done"
      ? inProgressState.splitId
      : null

  const hasActiveWorkout =
    inProgressSplitId !== null &&
    splits.some((s) => s.id === inProgressSplitId)

  const sortedSplits = useMemo(() => {
    if (!propuestoSplitId) return splits
    let proposed: (typeof splits)[number] | undefined
    const rest: typeof splits = []
    for (const s of splits) {
      if (s.id === propuestoSplitId) { proposed = s } else { rest.push(s) }
    }
    return proposed ? [proposed, ...rest] : splits
  }, [splits, propuestoSplitId])

  const breadcrumbItems = useMemo(() => [{ label: planName }], [planName])

  function getSplitVariant(splitId: string) {
    if (inProgressSplitId === splitId) return { variant: "in-progress" as const, completedExerciseCount: inProgressState.completedExerciseIds.length }
    if (hasActiveWorkout && inProgressState.splitId !== splitId) return { variant: "locked" as const }
    if (propuestoSplitId === splitId) return { variant: "proposed" as const }
    return { variant: "default" as const }
  }

  return (
    <motion.div
      className="mx-auto max-w-lg px-4 py-6 pb-24 space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Breadcrumb items={breadcrumbItems} className="px-0" />

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

      {membershipStatus !== "ACTIVE" && (
        <Link href="/membresia" className="block">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {membershipStatus === "EXPIRED"
                ? "Tu membresía ha vencido. Renová para seguir entrenando."
                : membershipStatus === "INACTIVE"
                  ? "Tu membresía está inactiva. Contactá al administrador."
                  : membershipStatus === "SUSPENDED"
                    ? "Tu membresía ha sido suspendida. Contactá al administrador."
                    : membershipStatus === "CANCELLED"
                      ? "Tu membresía ha sido cancelada."
                      : "Tu membresía no está activa."}
            </span>
          </div>
        </Link>
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
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-yellow/10 px-2.5 py-1 text-xs font-semibold text-accent-yellow">
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
          <Dumbbell className="h-5 w-5 text-accent-yellow" />
          Mis entrenamientos
        </h2>

        {sortedSplits.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay entrenamientos en esta rutina.
          </p>
        )}

        {sortedSplits.map((split, i) => (
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
              onClick={() => handleSplitClick(split.id)}
              {...getSplitVariant(split.id)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
