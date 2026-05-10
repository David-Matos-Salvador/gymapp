"use client"

import { cn } from "@/lib/utils"
import { Dumbbell, CheckCircle, Sparkles, Circle } from "lucide-react"

interface SplitCardProps {
  id: string
  label: string
  name: string
  description: string | null
  muscleGroups: string[]
  exerciseCount: number
  estimatedDuration: number | null
  isProposed: boolean
  isCompleted: boolean
  isInProgress: boolean
  completedExerciseCount: number
  onClick: () => void
}

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "Bíceps",
  TRICEPS: "Tríceps", LEGS: "Piernas", GLUTES: "Glúteos", ABS: "Abdominales",
  CALVES: "Pantorrillas", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

export function SplitCard({
  label,
  name,
  muscleGroups,
  exerciseCount,
  estimatedDuration,
  isProposed,
  isCompleted,
  isInProgress,
  completedExerciseCount,
  onClick,
}: SplitCardProps) {
  const totalExercises = exerciseCount
  const progressPct = totalExercises > 0 ? Math.round((completedExerciseCount / totalExercises) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border bg-card p-4 transition-all hover:shadow-md",
        isProposed && !isCompleted && "border-gym-amber/40 bg-gym-amber/[0.03] ring-1 ring-gym-amber/20",
        isCompleted && "border-gym-green/30 bg-gym-green/[0.03]",
        isInProgress && "border-blue-400/40 bg-blue-400/[0.03] ring-1 ring-blue-400/20",
        !isProposed && !isCompleted && !isInProgress && "hover:border-gym-orange/20"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold",
            isProposed && !isCompleted && "bg-gym-amber/10 text-gym-amber",
            isCompleted && "bg-gym-green/10 text-gym-green",
            isInProgress && "bg-blue-400/10 text-blue-400",
            !isProposed && !isCompleted && !isInProgress && "bg-gym-orange/10 text-gym-orange"
          )}
        >
          {isCompleted ? <CheckCircle className="h-5 w-5" /> : label}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{name}</p>
            {isProposed && !isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gym-amber/10 px-2 py-0.5 text-[10px] font-semibold text-gym-amber">
                <Sparkles className="h-2.5 w-2.5" /> Propuesto
              </span>
            )}
            {isInProgress && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                </span>
                En curso
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gym-green/10 px-2 py-0.5 text-[10px] font-semibold text-gym-green">
                <CheckCircle className="h-2.5 w-2.5" /> Completado
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {muscleGroups.map((g) => MUSCLE_LABELS[g] ?? g).join(" · ")}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {exerciseCount} ejercicios
              {estimatedDuration ? ` · ~${estimatedDuration} min` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isCompleted ? "bg-gym-green" : isInProgress ? "bg-blue-400" : "bg-gym-orange/40"
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </button>
  )
}
