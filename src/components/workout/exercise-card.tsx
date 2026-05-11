"use client"

import { useState, useCallback, useEffect } from "react"
import { Check, GripVertical, ChevronRight, ChevronDown, ChevronUp, Play, Clock, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  onToggleComplete: () => void
  onSetUpdate?: (setIdx: number, updates: Partial<SetLog>) => void
  onSetComplete?: (setIdx: number) => void
  onWeightChange?: (weight: number) => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
}

/* ── Dots indicator ─────────────────────────────── */
function DotsIndicator({
  setsData,
  totalSets,
  allCompleted,
}: {
  setsData: SetLog[]
  totalSets: number
  allCompleted: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSets }, (_, i) => {
        const set = setsData[i]
        const isFilled = set?.completed ?? false
        const isCurrent = !isFilled && setsData.slice(0, i).every((s) => s.completed) && !allCompleted

        return (
          <div
            key={i}
            className={cn(
              "flex h-2.5 w-2.5 items-center justify-center rounded-full border transition-all duration-300",
              isFilled
                ? "bg-accent-yellow border-accent-yellow"
                : isCurrent
                  ? "bg-accent-yellow/40 border-accent-yellow animate-pulse"
                  : "border-muted-foreground/30 bg-transparent",
            )}
          >
            {isFilled && <Check className="h-2 w-2 text-white" />}
          </div>
        )
      })}
      <span className="text-[10px] text-muted-foreground ml-1">{setsData[0]?.reps ?? 0} reps</span>
    </div>
  )
}

/* ── Set stepper (interactive) ──────────────────── */
function SetStepper({
  setsData,
  totalSets,
  onSetToggle,
}: {
  setsData: SetLog[]
  totalSets: number
  onSetToggle: (setIdx: number) => void
}) {
  return (
    <div className="w-full space-y-1.5">
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
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all cursor-pointer hover:brightness-110",
              isFilled
                ? "bg-accent-yellow/10 text-accent-yellow"
                : isCurrent
                  ? "bg-accent-yellow/5 border border-accent-yellow/30 text-accent-yellow"
                  : "text-muted-foreground/60 hover:bg-muted/30",
            )}
          >
            <span className="w-4 font-mono font-medium tabular-nums">{i + 1}</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[9px] tabular-nums text-muted-foreground/70">
              {setsData[0]?.reps ?? 0}r × {setsData[0]?.weight ?? 0}kg
            </span>
            {isFilled ? (
              <Check className="h-3 w-3 shrink-0" />
            ) : (
              <div className={cn(
                "h-4 w-4 rounded border border-muted-foreground/30 shrink-0",
                isCurrent && "border-accent-yellow/50",
              )} />
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Rest mini-bar ───────────────────────────────── */
function RestIndicator({ restSeconds }: { restSeconds: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <Clock className="h-3 w-3" />
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500/60 transition-all duration-500"
          style={{ width: `${Math.min((restSeconds / 90) * 100, 100)}%` }}
        />
      </div>
      <span className="tabular-nums w-8 text-right">{restSeconds}s</span>
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
  onToggleComplete,
  onSetComplete,
  onWeightChange,
  dragHandleProps,
  isDragging,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [localWeight, setLocalWeight] = useState(setsData[0]?.weight ?? se.weight)
  const imageSrc = se.exercise.imageUrl || "/without-img.png"

  const completedCount = setsData.filter((s) => s.completed).length

  const handleToggleSet = useCallback(
    (setIdx: number) => {
      onSetComplete?.(setIdx)
    },
    [onSetComplete],
  )

  const handleExpand = useCallback(() => {
    if (!isInCompletedSection && isActive) {
      setExpanded((prev) => !prev)
    }
  }, [isInCompletedSection, isActive])

  const handleStart = useCallback(() => {
    if (!isInCompletedSection && isActive) {
      setExpanded(true)
    }
  }, [isInCompletedSection, isActive])

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

  /* Auto-complete exercise when all sets are done */
  useEffect(() => {
    if (!allCompleted && setsData.length > 0 && setsData.every((s) => s.completed)) {
      onToggleComplete()
    }
  }, [setsData, allCompleted, onToggleComplete])

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-3 transition-all duration-300 select-none",
        isCurrent && isActive && !isInCompletedSection && "ring-2 ring-accent-yellow/40 border-accent-yellow/30 shadow-accent-yellow/5 shadow-md",
        isDragging && "opacity-50 scale-95 shadow-lg",
        !isInCompletedSection && !isCompleted && "border-border",
      )}
    >
      {/* ── Header row ─────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Drag handle — no longer pointer-events-none on completed */}
        <div {...dragHandleProps} className="flex items-center cursor-grab active:cursor-grabbing touch-none shrink-0">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>

        {/* Tappable area to expand */}
        <button
          type="button"
          onClick={handleExpand}
          disabled={isInCompletedSection || !isActive}
          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer disabled:cursor-default"
        >
          <img
            src={imageSrc}
            alt={se.exercise.name}
            className="h-11 w-11 rounded-lg object-cover bg-muted shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate",
              isInCompletedSection && "line-through decoration-muted-foreground/30",
            )}>
              {se.exercise.name}
            </p>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {MUSCLE_GROUP_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
              </span>
              <span className="text-[9px] text-muted-foreground/50">·</span>

              <DotsIndicator setsData={setsData} totalSets={se.sets} allCompleted={allCompleted} />

              {se.restSeconds > 0 && (
                <>
                  <span className="text-[9px] text-muted-foreground/40">·</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {se.restSeconds}s
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Right-side controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isInCompletedSection && isActive && (
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded transition-opacity duration-200",
              expanded ? "opacity-0" : "opacity-100 text-muted-foreground",
            )}>
              series
            </span>
          )}

          <button
            type="button"
            onClick={handleExpand}
            disabled={isInCompletedSection || !isActive}
            className={cn(
              "p-1 rounded-md transition-colors",
              isInCompletedSection || !isActive
                ? "text-muted-foreground/20"
                : expanded
                  ? "bg-accent-yellow/10 text-accent-yellow"
                  : isCurrent
                    ? "text-accent-yellow/50 hover:text-accent-yellow/70"
                    : "text-muted-foreground/30 hover:text-muted-foreground/50",
            )}
            aria-label={expanded ? "Colapsar series" : "Ver series"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <ExerciseDetailSheet exercise={se.exercise}>
            <button
              type="button"
              className={cn(
                "p-1 rounded-md transition-colors",
                isCurrent && isActive
                  ? "text-accent-yellow/40 hover:text-accent-yellow/70"
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
      </div>

      {/* ── Expanded: Weight + Set Stepper ─────────── */}
      {expanded && !isInCompletedSection && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-3 animate-in slide-in-from-top-1 fade-in">
          {/* Weight editor + Play */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <button
                type="button"
                onClick={decrementWeight}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="Reducir peso"
              >
                <Minus className="h-3 w-3 text-muted-foreground" />
              </button>
              <span className="font-mono text-sm tabular-nums font-medium min-w-[3ch] text-center">
                {localWeight ?? 0}
              </span>
              <span className="text-[9px] text-muted-foreground">kg</span>
              <button
                type="button"
                onClick={incrementWeight}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="Aumentar peso"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-accent-yellow hover:text-accent-yellow/80 hover:bg-accent-yellow/10 ml-auto"
              onClick={handleStart}
            >
              <Play className="h-3.5 w-3.5" />
              Iniciar
            </Button>
          </div>

          <RestIndicator restSeconds={se.restSeconds} />

          <SetStepper
            setsData={setsData}
            totalSets={se.sets}
            onSetToggle={(setIdx) => handleToggleSet(setIdx)}
          />
        </div>
      )}

      {/* ── Completed card footer ───────── */}
      {isInCompletedSection && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {completedCount}/{se.sets} series · {localWeight ?? se.weight}kg
            </span>
            <RestIndicator restSeconds={se.restSeconds} />
          </div>
        </div>
      )}
    </div>
  )
}