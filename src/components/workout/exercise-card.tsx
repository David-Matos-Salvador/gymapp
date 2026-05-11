"use client"

import { useState, useCallback, useEffect } from "react"
import { Check, GripVertical, ChevronRight, Clock, Minus, Plus, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SetLog, SplitExercise } from "@/types/exercise"
import { ExerciseDetailSheet } from "./exercise-detail-sheet"

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  LEGS: "Piernas",
  GLUTES: "Glúteos",
  ABS: "Abdominales",
  CALVES: "Pantorrillas",
  FOREARMS: "Antebrazos",
  TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo",
  CARDIO: "Cardio",
}

interface ExerciseCardProps {
  se: SplitExercise
  setsData: SetLog[]
  isCurrent: boolean
  isActive: boolean
  isCompleted: boolean
  allCompleted: boolean
  isInCompletedSection: boolean
  onCompleteExercise?: () => void
  onToggleComplete: () => void
  onSetUpdate?: (setIdx: number, updates: Partial<SetLog>) => void
  onSetComplete?: (setIdx: number) => void
  onWeightChange?: (weight: number) => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
}

/* ── Set Tiles (visual grid) ────────────────────── */
function SetTiles({
  setsData,
  totalSets,
  onSetToggle,
}: {
  setsData: SetLog[]
  totalSets: number
  onSetToggle: (setIdx: number) => void
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: totalSets }, (_, i) => {
        const set = setsData[i]
        const isFilled = set?.completed ?? false
        const prevCompleted = setsData.slice(0, i).every((s) => s.completed)
        const isCurrent = !isFilled && prevCompleted

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSetToggle(i)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-xs font-mono tabular-nums transition-all cursor-pointer min-w-[56px]",
              isFilled
                ? "bg-accent-yellow/15 border-accent-yellow/40 text-accent-yellow"
                : isCurrent
                  ? "bg-accent-yellow/5 border-accent-yellow/40 text-accent-yellow ring-1 ring-accent-yellow/30"
                  : "border-muted-foreground/20 text-muted-foreground/60 hover:border-muted-foreground/40",
            )}
          >
            <span className={cn(
              "text-[10px] font-bold",
              isFilled ? "text-accent-yellow" : "text-muted-foreground",
            )}>
              {i + 1}
            </span>
            {isFilled ? (
              <Check className="h-4 w-4" />
            ) : (
              <div className={cn(
                "h-4 w-4 rounded border",
                isCurrent ? "border-accent-yellow/60" : "border-muted-foreground/30",
              )} />
            )}
            <span className="text-[9px] text-muted-foreground tabular-nums">
              {set?.reps ?? 0}r
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Weight editor ──────────────────────────────── */
function WeightEditor({
  weight,
  onIncrement,
  onDecrement,
}: {
  weight: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onDecrement}
        className="p-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors"
        aria-label="Reducir peso"
      >
        <Minus className="h-3 w-3 text-muted-foreground" />
      </button>
      <span className="font-mono text-lg tabular-nums font-bold min-w-[3ch] text-center">
        {weight ?? 0}
      </span>
      <span className="text-[10px] text-muted-foreground mr-1">kg</span>
      <button
        type="button"
        onClick={onIncrement}
        className="p-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors"
        aria-label="Aumentar peso"
      >
        <Plus className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}

/* ── Main Card ───────────────────────────────────── */
export function ExerciseCard({
  se,
  setsData,
  isCurrent,
  isActive,
  isCompleted,
  allCompleted,
  isInCompletedSection,
  onCompleteExercise,
  onToggleComplete,
  onSetComplete,
  onWeightChange,
  dragHandleProps,
  isDragging,
}: ExerciseCardProps) {
  const [localWeight, setLocalWeight] = useState(setsData[0]?.weight ?? se.weight)
  const imageSrc = se.exercise.imageUrl || "/without-img.png"
  const completedCount = setsData.filter((s) => s.completed).length
  const isFullView = isCurrent && isActive && !isInCompletedSection

  const handleToggleSet = useCallback(
    (setIdx: number) => {
      onSetComplete?.(setIdx)
    },
    [onSetComplete],
  )

  const applyWeight = useCallback(
    (newWeight: number) => {
      onWeightChange?.(newWeight)
    },
    [onWeightChange],
  )

  const incrementWeight = useCallback(() => {
    const curr = localWeight ?? 0
    setLocalWeight(curr + 2.5)
    applyWeight(curr + 2.5)
  }, [localWeight, applyWeight])

  const decrementWeight = useCallback(() => {
    const curr = localWeight ?? 0
    const next = Math.max(0, curr - 2.5)
    setLocalWeight(next)
    applyWeight(next)
  }, [localWeight, applyWeight])

  useEffect(() => {
    if (setsData.length > 0 && setsData.every((s) => s.completed)) {
      onCompleteExercise?.()
    }
  }, [setsData, onCompleteExercise])

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-3 transition-all duration-300 select-none gap-3",
        isFullView && "ring-2 ring-accent-yellow/40 border-accent-yellow/30 shadow-accent-yellow/5 shadow-md",
        isDragging && "opacity-50 scale-95 shadow-lg",
        isInCompletedSection && "opacity-70",
        !isActive && !isInCompletedSection && "opacity-50",
      )}
    >
      {/* ── Header row ─────────────────────────── */}
      <div className="flex items-center gap-2">
        {isInCompletedSection ? (
          <CheckCircle className="h-4 w-4 text-accent-yellow shrink-0" />
        ) : (
          <div {...dragHandleProps} className="flex items-center cursor-grab active:cursor-grabbing touch-none shrink-0">
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={imageSrc}
            alt={se.exercise.name}
            className="h-10 w-10 rounded-lg object-cover bg-muted shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate",
              isInCompletedSection && "line-through decoration-muted-foreground/40",
            )}>
              {se.exercise.name}
            </p>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {MUSCLE_GROUP_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
              </span>
              <span className="text-[9px] text-muted-foreground/40">·</span>
              <span className="text-[10px] text-muted-foreground">
                {se.sets} {se.sets === 1 ? "serie" : "series"} · {se.reps} reps
              </span>
              {se.restSeconds > 0 && (
                <>
                  <span className="text-[9px] text-muted-foreground/40">·</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {se.restSeconds}s
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <ExerciseDetailSheet exercise={se.exercise}>
          <button
            type="button"
            className={cn(
              "p-1 rounded-md transition-colors shrink-0",
              isFullView
                ? "text-accent-yellow/50 hover:text-accent-yellow/80"
                : isInCompletedSection
                  ? "text-muted-foreground/20"
                  : "text-muted-foreground/30",
            )}
            aria-label="Detalle del ejercicio"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </ExerciseDetailSheet>
      </div>

      {/* ── Full view: current active exercise ──── */}
      {isFullView && (
        <>
          <div className="flex items-center justify-between">
            <WeightEditor
              weight={localWeight ?? 0}
              onIncrement={incrementWeight}
              onDecrement={decrementWeight}
            />
          </div>

          <SetTiles
            setsData={setsData}
            totalSets={se.sets}
            onSetToggle={(setIdx) => handleToggleSet(setIdx)}
          />
        </>
      )}

      {/* ── Pending state: future exercise ──────── */}
      {!isCurrent && !isInCompletedSection && isActive && (
        <p className="text-[10px] text-muted-foreground/60 italic">
          ⏳ Pendiente
        </p>
      )}

      {/* ── Completed section: summary ──────────── */}
      {isInCompletedSection && (
        <p className="text-[10px] text-muted-foreground">
          {completedCount}/{se.sets} series · {localWeight ?? se.weight}kg
        </p>
      )}
    </div>
  )
}
