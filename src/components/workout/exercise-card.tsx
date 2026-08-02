"use client"

import { MUSCLE_LABELS } from "@/constants/user"
import { useState, useCallback, useEffect, useRef } from "react"
import { Check, GripVertical, ChevronRight, Clock, Minus, Plus, CheckCircle, ChevronDown, ChevronUp, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SetLog, SplitExercise } from "@/types/exercise"
import { ExerciseDetailSheet } from "./exercise-detail-sheet"
import { ExerciseImage } from "@/components/exercise/exercise-image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type ExerciseAppearance = "current" | "pending" | "completed"

interface ExerciseCardProps {
  se: SplitExercise
  setsData: SetLog[]
  appearance: ExerciseAppearance
  onSetComplete?: (setIdx: number) => void
  onWeightChange?: (weight: number) => void
  onSetsCountChange?: (newCount: number) => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
  onContinue?: () => void
}

/* ── CounterRow (generic) ──────────────────────── */
function CounterRow({
  label,
  value,
  onIncrement,
  onDecrement,
  disabled,
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      <div className="inline-flex items-center gap-1 bg-muted/30 rounded-lg px-1.5 py-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onDecrement}
          className="flex items-center justify-center h-6 w-6 rounded-full border border-border/40 bg-background hover:bg-muted hover:border-border transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Minus className="h-3 w-3 text-muted-foreground" />
        </button>
        <span className="font-mono text-sm tabular-nums font-bold min-w-[3ch] text-center">
          {value}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={onIncrement}
          className="flex items-center justify-center h-6 w-6 rounded-full border border-border/40 bg-background hover:bg-muted hover:border-border transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

/* ── Reps Counter per set ──────────────────────── */
function RepsDisplay({
  value,
}: {
  value: number
}) {
  return (
    <span className="text-[10px] text-muted-foreground font-medium">
      {value} reps
    </span>
  )
}

/* ── Sets Stepper (expandable) ────────────────── */
function SetsStepper({
  setsData,
  totalSets,
  onSetToggle,
  restActive,
  restRemaining,
  restTotal,
  expanded,
  onExpandedChange,
}: {
  setsData: SetLog[]
  totalSets: number
  onSetToggle: (setIdx: number) => void
  restActive: boolean
  restRemaining: number
  restTotal: number
  expanded: boolean
  onExpandedChange: (v: boolean) => void
}) {
  const completedCount = setsData.filter((s) => s.completed).length

  return (
    <div className="border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="w-full flex items-center justify-between py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium">
          Detalle de series ({completedCount}/{totalSets})
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2 mt-2">
          {/* Horizontal stepper */}
          <div className="flex items-start justify-between gap-0">
            {Array.from({ length: totalSets }, (_, i) => {
              const set = setsData[i]
              const isFilled = set?.completed ?? false
              const prevCompleted = setsData.slice(0, i).every((s) => s.completed)
              const isCurrent = !isFilled && prevCompleted && !restActive
              const isBlocked = !isFilled && !prevCompleted

              return (
                <div key={i} className="flex items-stretch flex-1 min-w-0">
                  {/* Step block */}
                  <div className={cn(
                    "flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all flex-1",
                    isFilled && "bg-accent-yellow/5",
                    isCurrent && "bg-accent-yellow/5 ring-1 ring-accent-yellow/30",
                    isBlocked && "opacity-40",
                  )}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isBlocked) return
                        onSetToggle(i)
                      }}
                      disabled={isBlocked}
                      className={cn(
                        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border-2 text-[11px] font-bold font-mono transition-all",
                        isFilled
                          ? "bg-accent-yellow border-accent-yellow text-white"
                          : isCurrent
                            ? "border-accent-yellow text-accent-yellow"
                            : "border-muted-foreground/20 text-muted-foreground/50",
                        !isBlocked && !isFilled && "cursor-pointer hover:border-accent-yellow/60 hover:text-accent-yellow/80 active:scale-90",
                      )}
                    >
                      {isFilled ? <Check className="h-4 w-4" /> : i + 1}
                    </button>
                    <RepsDisplay value={set?.reps ?? 0} />
                  </div>

                  {/* Horizontal rest bar between step i and i+1 */}
                  {(() => {
                    if (i >= totalSets - 1) return null
                    const nextSet = setsData[i + 1]
                    const nextPrevDone = setsData.slice(0, i + 1).every((s) => s.completed)
                    const barActive = isFilled && !nextSet?.completed && nextPrevDone && restActive && restTotal > 0
                    const progressPct = restTotal > 0 ? ((restTotal - restRemaining) / restTotal) * 100 : 0

                    return (
                      <div className="flex items-stretch w-14 shrink-0 px-1">
                        <div className="flex-1 flex items-center">
                          <div className="w-full h-1.5 rounded-full bg-muted/50 relative overflow-hidden">
                            {barActive && (
                              <div
                                className="absolute inset-y-0 left-0 bg-accent-yellow/60 rounded-full transition-all duration-1000 ease-linear"
                                style={{ width: `${progressPct}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {restActive && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const nextIncomplete = setsData.findIndex((s) => !s.completed)
                  if (nextIncomplete >= 0) onSetToggle(nextIncomplete)
                }}
                className="text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Saltar descanso
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main Card ─────────────────────────────────── */
export function ExerciseCard({
  se,
  setsData,
  appearance,
  onSetComplete,
  onWeightChange,
  onSetsCountChange,
  dragHandleProps,
  isDragging,
  onContinue,
}: ExerciseCardProps) {
  const [localWeight, setLocalWeight] = useState(setsData[0]?.weight ?? se.weight)
  const completedCount = setsData.filter((s) => s.completed).length
  const totalSets = setsData.length
  const isCurrent = appearance === "current"
  const isCompleted = appearance === "completed"
  const restIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [perSetRestRemaining, setPerSetRestRemaining] = useState(0)
  const [perSetRestActive, setPerSetRestActive] = useState(false)
  const [stepperExpanded, setStepperExpanded] = useState(false)
  const allCompleted = totalSets > 0 && setsData.every((s) => s.completed)

  const clearPerSetRest = useCallback(() => {
    if (restIntervalRef.current) { clearInterval(restIntervalRef.current); restIntervalRef.current = null }
    setPerSetRestActive(false)
    setPerSetRestRemaining(0)
  }, [])

  useEffect(() => {
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current) }
  }, [])

  const handleToggleSet = useCallback(
    (setIdx: number) => {
      clearPerSetRest()
      const isAlreadyCompleted = setsData[setIdx]?.completed ?? false
      if (!isAlreadyCompleted) {
        const newCount = completedCount + 1
        if (newCount < totalSets && se.restSeconds > 0) {
          setPerSetRestRemaining(se.restSeconds)
          setPerSetRestActive(true)
          restIntervalRef.current = setInterval(() => {
            setPerSetRestRemaining((prev) => {
              const next = prev - 1
              if (next <= 0) {
                if (restIntervalRef.current) { clearInterval(restIntervalRef.current); restIntervalRef.current = null }
                setPerSetRestActive(false)
                return 0
              }
              return next
            })
          }, 1000)
        }
      }
      onSetComplete?.(setIdx)
    },
    [onSetComplete, clearPerSetRest, completedCount, setsData, totalSets, se.restSeconds],
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

  const handleSetsIncrement = useCallback(() => {
    onSetsCountChange?.(totalSets + 1)
  }, [onSetsCountChange, totalSets])

  const handleSetsDecrement = useCallback(() => {
    if (totalSets <= 1) return
    onSetsCountChange?.(totalSets - 1)
  }, [onSetsCountChange, totalSets])

  const handleContinue = useCallback(() => {
    if (stepperExpanded && !allCompleted) {
      toast.warning("No has completado todas las series")
      return
    }
    onContinue?.()
  }, [stepperExpanded, allCompleted, onContinue])

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-3 transition-all duration-300 select-none gap-2",
        isCurrent && "ring-2 ring-accent-yellow/40 border-accent-yellow/30 shadow-accent-yellow/5 shadow-md",
        isDragging && "opacity-50 scale-95 shadow-lg",
        isCompleted && "opacity-70",
      )}
    >
      {/* ── Header row ─────────────────────────── */}
      <div className="flex items-center gap-2">
        {isCompleted ? (
          <CheckCircle className="h-4 w-4 text-accent-yellow shrink-0" />
        ) : (
          <div {...dragHandleProps} className="flex items-center cursor-grab active:cursor-grabbing touch-none shrink-0 group/drag">
            <GripVertical className={cn(
              "h-4 w-4 transition-colors",
              isCurrent
                ? "text-muted-foreground/30"
                : "text-muted-foreground/25 group-hover/drag:text-muted-foreground/50",
            )} />
          </div>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ExerciseImage
            imageUrl={se.exercise.imageUrl}
            alt={se.exercise.name}
            size="sm"
          />

          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium truncate",
              isCompleted && "line-through decoration-muted-foreground/40",
            )}>
              {se.exercise.name}
            </p>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {MUSCLE_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
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
              isCurrent
                ? "text-accent-yellow/50 hover:text-accent-yellow/80"
                : isCompleted
                  ? "text-muted-foreground/20"
                  : "text-muted-foreground/30",
            )}
            aria-label="Detalle del ejercicio"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </ExerciseDetailSheet>
      </div>

      {/* ── Current: weight + sets counter + stepper ── */}
      {isCurrent && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-1 flex-wrap">
            <CounterRow
              label="kg"
              value={localWeight ?? 0}
              onIncrement={incrementWeight}
              onDecrement={decrementWeight}
            />
            <CounterRow
              label="Series"
              value={totalSets}
              onIncrement={handleSetsIncrement}
              onDecrement={handleSetsDecrement}
            />
            <span className={cn(
              "text-[11px] tabular-nums font-medium ml-auto",
              completedCount === totalSets ? "text-accent-yellow" : "text-muted-foreground/50",
            )}>
              {completedCount}/{totalSets}
            </span>
          </div>

          {/* Continue button */}
          {onContinue && (
            <div>
              <Button
                onClick={handleContinue}
                size="sm"
                className="w-full gap-2"
              >
                Continuar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <SetsStepper
            key={`stepper-${totalSets}`}
            setsData={setsData}
            totalSets={totalSets}
            onSetToggle={(setIdx) => handleToggleSet(setIdx)}
            restActive={perSetRestActive}
            restRemaining={perSetRestRemaining}
            restTotal={se.restSeconds}
            expanded={stepperExpanded}
            onExpandedChange={setStepperExpanded}
          />

        </div>
      )}

      {/* ── Pending state: future exercise ──────── */}
      {appearance === "pending" && (
        <p className="text-[10px] text-muted-foreground/60 italic">
          ⏳ Pendiente
        </p>
      )}

      {/* ── Completed section: summary ──────────── */}
      {isCompleted && (
        <p className="text-[10px] text-muted-foreground">
          {completedCount}/{totalSets} series · {localWeight ?? se.weight}kg
        </p>
      )}
    </div>
  )
}
