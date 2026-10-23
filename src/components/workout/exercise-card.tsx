"use client"

import { MUSCLE_LABELS } from "@/constants/user"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Check,
  GripVertical,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SetLog, SplitExercise, GymEquipmentRef } from "@/types/exercise"
import { ExerciseDetailSheet } from "./exercise-detail-sheet"
import { ExerciseImage } from "@/components/exercise/exercise-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  onSetUpdate?: (setIdx: number, updates: Partial<SetLog>) => void
  lastPerformance?: { weight: number; reps: number } | null
  userGymId?: string
  showMachineNumbers?: boolean
}

function formatMachineLabel(list: GymEquipmentRef[], showNumbers: boolean): string | null {
  if (list.length === 0) return null
  const numbered = showNumbers && list.every((e) => e.machineNumber != null)
  const parts = numbered ? list.map((e) => String(e.machineNumber)) : list.map((e) => e.name)
  if (list.length === 1) return numbered ? `Máquina ${parts[0]}` : parts[0]
  return numbered ? `Máquinas ${parts.join(", ")}` : `Máquinas: ${parts.join(", ")}`
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
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="inline-flex items-center gap-1 bg-muted/30 rounded-lg px-1.5 py-0.5">
        <button
          type="button"
          aria-label={`Disminuir ${label}`}
          disabled={disabled}
          onClick={onDecrement}
          className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-border/40 bg-background transition-all hover:border-border hover:bg-muted active:scale-90 disabled:pointer-events-none disabled:opacity-30"
        >
          <Minus className="h-3 w-3 text-muted-foreground" />
        </button>
        <span className="font-mono text-sm tabular-nums font-bold min-w-[3ch] text-center">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={disabled}
          onClick={onIncrement}
          className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-border/40 bg-background transition-all hover:border-border hover:bg-muted active:scale-90 disabled:pointer-events-none disabled:opacity-30"
        >
          <Plus className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

/* ── Reps Counter per set ──────────────────────── */
function RepsDisplay({ value }: { value: number }) {
  return <span className="text-xs text-muted-foreground font-medium">{value} reps</span>
}

/* ── Sets Stepper (expandable) ────────────────── */
function SetsStepper({
  setsData,
  totalSets,
  onSetToggle,
  restActive,
  expanded,
  onExpandedChange,
  onSetUpdate,
}: {
  setsData: SetLog[]
  totalSets: number
  onSetToggle: (setIdx: number) => void
  onSetUpdate?: (setIdx: number, updates: Partial<SetLog>) => void
  restActive: boolean
  expanded: boolean
  onExpandedChange: (v: boolean) => void
}) {
  const completedCount = setsData.filter((s) => s.completed).length

  return (
    <div className="border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="flex min-h-11 w-full items-center justify-between py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="font-medium">
          Detalle de series ({completedCount}/{totalSets})
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2 mt-2">
          {/* Horizontal stepper */}
          <div className="flex flex-wrap items-start gap-2">
            {Array.from({ length: totalSets }, (_, i) => {
              const set = setsData[i]
              const isFilled = set?.completed ?? false
              const prevCompleted = setsData.slice(0, i).every((s) => s.completed)
              const isCurrent = !isFilled && prevCompleted && !restActive
              const isBlocked = !isFilled && !prevCompleted

              return (
                <div key={i} className="flex items-stretch">
                  {/* Step block */}
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg p-1 transition-all",
                      isFilled && "bg-accent-yellow/5",
                      isCurrent && "bg-accent-yellow/5 ring-1 ring-accent-yellow/30",
                      isBlocked && "opacity-40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isBlocked) return
                        onSetToggle(i)
                      }}
                      disabled={isBlocked}
                      aria-label={`Serie ${i + 1}${isFilled ? " completada" : isCurrent ? " actual" : ""}`}
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-mono text-sm font-bold transition-all",
                        isFilled
                          ? "bg-accent-yellow border-accent-yellow text-primary-foreground"
                          : isCurrent
                            ? "border-accent-yellow text-accent-yellow"
                            : "border-muted-foreground/20 text-muted-foreground/50",
                        !isBlocked &&
                          !isFilled &&
                          "cursor-pointer hover:border-accent-yellow/60 hover:text-accent-yellow/80 active:scale-90"
                      )}
                    >
                      {isFilled ? <Check className="h-4 w-4" /> : i + 1}
                    </button>
                    <RepsDisplay value={set?.reps ?? 0} />
                  </div>
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
                className="text-xs px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Saltar descanso
              </button>
            </div>
          )}
          {(() => {
            const next = setsData.findIndex((set) => !set.completed)
            if (next < 0) return null
            const current = setsData[next]
            return (
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-xs">
                <span className="font-medium">Serie {next + 1}:</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={current.reps}
                  onChange={(e) =>
                    onSetUpdate?.(next, { reps: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="h-10 w-16 text-center text-base"
                  inputMode="numeric"
                  aria-label={`Reps serie ${next + 1}`}
                />
                <span className="text-muted-foreground">reps</span>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={current.weight}
                  onChange={(e) =>
                    onSetUpdate?.(next, { weight: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="h-10 w-20 text-center text-base"
                  inputMode="decimal"
                  aria-label={`Peso serie ${next + 1}`}
                />
                <span className="text-muted-foreground">kg</span>
              </div>
            )
          })()}
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
  onSetUpdate,
  lastPerformance,
  userGymId,
  showMachineNumbers = false,
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

  const machineLabel = useMemo(() => {
    const list = se.exercise.gymEquipments ?? []
    return formatMachineLabel(list, showMachineNumbers)
  }, [se.exercise.gymEquipments, showMachineNumbers])

  const clearPerSetRest = useCallback(() => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current)
      restIntervalRef.current = null
    }
    setPerSetRestActive(false)
    setPerSetRestRemaining(0)
  }, [])

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    }
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
                if (restIntervalRef.current) {
                  clearInterval(restIntervalRef.current)
                  restIntervalRef.current = null
                }
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
    [onSetComplete, clearPerSetRest, completedCount, setsData, totalSets, se.restSeconds]
  )

  const applyWeight = useCallback(
    (newWeight: number) => {
      onWeightChange?.(newWeight)
    },
    [onWeightChange]
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

  const nextIncomplete = setsData.findIndex((set) => !set.completed)

  const handlePrimaryAction = useCallback(() => {
    if (nextIncomplete >= 0) {
      setStepperExpanded(true)
      handleToggleSet(nextIncomplete)
      return
    }
    onContinue?.()
  }, [handleToggleSet, nextIncomplete, onContinue])

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-3 transition-all duration-300 select-none gap-2",
        isCurrent &&
          "ring-2 ring-accent-yellow/40 border-accent-yellow/30 shadow-accent-yellow/5 shadow-md",
        isDragging && "opacity-50 scale-95 shadow-lg",
        isCompleted && "opacity-70"
      )}
    >
      {/* ── Header row ─────────────────────────── */}
      <div className="flex items-center gap-2">
        {isCompleted ? (
          <CheckCircle className="h-4 w-4 text-accent-yellow shrink-0" />
        ) : (
          <div
            {...dragHandleProps}
            className="flex items-center cursor-grab active:cursor-grabbing touch-none shrink-0 group/drag"
          >
            <GripVertical
              className={cn(
                "h-4 w-4 transition-colors",
                isCurrent
                  ? "text-muted-foreground/30"
                  : "text-muted-foreground/25 group-hover/drag:text-muted-foreground/50"
              )}
            />
          </div>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ExerciseImage imageUrl={se.exercise.imageUrl} alt={se.exercise.name} size="md" />

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium truncate",
                isCompleted && "line-through decoration-muted-foreground/40"
              )}
            >
              {se.exercise.name}
            </p>

            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {MUSCLE_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
              </span>
              {machineLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-1.5 py-0.5">
                  <Wrench className="h-2.5 w-2.5" />
                  {machineLabel}
                </span>
              )}
              {se.restSeconds > 0 && (
                <>
                  <span className="text-[11px] text-muted-foreground/40">·</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {se.restSeconds}s
                  </span>
                </>
              )}
            </div>
            {lastPerformance && isCurrent && (
              <button
                type="button"
                onClick={() => {
                  onWeightChange?.(lastPerformance.weight)
                  if (nextIncomplete >= 0) {
                    onSetUpdate?.(nextIncomplete, {
                      weight: lastPerformance.weight,
                      reps: lastPerformance.reps,
                    })
                  }
                }}
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Última: {lastPerformance.weight} kg × {lastPerformance.reps} · usar
              </button>
            )}
          </div>
        </div>

        <ExerciseDetailSheet
          exercise={se.exercise}
          userGymId={userGymId}
          showMachineNumbers={showMachineNumbers}
        >
          <button
            type="button"
            className={cn(
              "p-1 rounded-md transition-colors shrink-0",
              isCurrent
                ? "text-accent-yellow/50 hover:text-accent-yellow/80"
                : isCompleted
                  ? "text-muted-foreground/20"
                  : "text-muted-foreground/30"
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
            <span
              className={cn(
                "text-[11px] tabular-nums font-medium ml-auto",
                completedCount === totalSets ? "text-accent-yellow" : "text-muted-foreground/50"
              )}
            >
              {completedCount}/{totalSets}
            </span>
          </div>

          {/* Continue button */}
          {onContinue && (
            <div>
              <Button onClick={handlePrimaryAction} className="min-h-11 w-full gap-2">
                {nextIncomplete >= 0
                  ? `Completar serie ${nextIncomplete + 1} de ${totalSets}`
                  : "Siguiente ejercicio"}
                {nextIncomplete < 0 && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}

          <SetsStepper
            key={`stepper-${totalSets}`}
            setsData={setsData}
            totalSets={totalSets}
            onSetToggle={(setIdx) => handleToggleSet(setIdx)}
            restActive={perSetRestActive}
            expanded={stepperExpanded}
            onExpandedChange={setStepperExpanded}
            onSetUpdate={onSetUpdate}
          />
        </div>
      )}

      {/* ── Completed section: summary ──────────── */}
      {isCompleted && (
        <p className="text-xs text-muted-foreground">
          {completedCount}/{totalSets} series · {localWeight ?? se.weight}kg
        </p>
      )}
    </div>
  )
}
