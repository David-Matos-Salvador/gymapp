"use client"

import { MUSCLE_LABELS } from "@/constants/user"
import { SET_LIMITS, clampSetValue, setLimitError, weightLabel } from "@/constants/workout"
import { toast } from "sonner"
import { useState, useCallback, useMemo } from "react"
import {
  Check,
  GripVertical,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  CheckCircle,
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
  onSkip?: () => void
  skipped?: boolean
  onSetUpdate?: (setIdx: number, updates: Partial<SetLog>) => void
  onStartRest?: (seconds: number) => void
  lastPerformance?: Array<{ weight: number; reps: number }> | null
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
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
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

/* ── Sets Stepper (expandable) ────────────────── */
function SetsStepper({
  setsData,
  onSetUpdate,
  bodyweight,
}: {
  setsData: SetLog[]
  onSetUpdate?: (setIdx: number, updates: Partial<SetLog>) => void
  bodyweight: boolean
}) {
  const completedCount = setsData.filter((s) => s.completed).length

  return (
    <div className="border-t border-border/40 pt-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">Series</span>
        <span className="tabular-nums text-muted-foreground">
          {completedCount}/{setsData.length}
        </span>
      </div>

      <div className="space-y-2">
        {setsData.map((set, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2 transition-colors",
              set.completed && "border-accent-yellow/30 bg-accent-yellow/5"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                set.completed
                  ? "border-accent-yellow bg-accent-yellow text-primary-foreground"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
              aria-hidden
            >
              {set.completed ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={SET_LIMITS.reps.min}
              max={SET_LIMITS.reps.max}
              value={set.reps}
              onChange={(e) =>
                onSetUpdate?.(i, {
                  reps: clampSetValue("reps", Math.trunc(Number(e.target.value))),
                })
              }
              className="h-11 w-16 text-center text-base"
              aria-label={`Reps serie ${i + 1}`}
            />
            <span className="text-xs text-muted-foreground">reps</span>
            <Input
              type="number"
              inputMode="decimal"
              min={SET_LIMITS.weight.min}
              max={SET_LIMITS.weight.max}
              step="0.5"
              value={set.weight}
              onChange={(e) =>
                onSetUpdate?.(i, { weight: clampSetValue("weight", Number(e.target.value)) })
              }
              className="h-11 w-20 text-center text-base"
              aria-label={`${bodyweight ? "Lastre" : "Peso"} serie ${i + 1}`}
            />
            <span className="text-xs text-muted-foreground">{bodyweight ? "kg lastre" : "kg"}</span>
          </div>
        ))}
      </div>
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
  onSkip,
  skipped = false,
  onSetUpdate,
  onStartRest,
  lastPerformance,
  userGymId,
  showMachineNumbers = false,
}: ExerciseCardProps) {
  const [localWeight, setLocalWeight] = useState(setsData[0]?.weight ?? se.weight)
  const completedCount = setsData.filter((s) => s.completed).length
  const totalSets = setsData.length
  const isCurrent = appearance === "current"
  const isCompleted = appearance === "completed"
  const bodyweight = se.exercise.equipment === "BODYWEIGHT"
  const shownWeight = localWeight ?? se.weight
  const machineLabel = useMemo(() => {
    const list = se.exercise.gymEquipments ?? []
    return formatMachineLabel(list, showMachineNumbers)
  }, [se.exercise.gymEquipments, showMachineNumbers])

  const handleToggleSet = useCallback(
    (setIdx: number) => {
      const isAlreadyCompleted = setsData[setIdx]?.completed ?? false
      if (!isAlreadyCompleted) {
        const limitError = setsData[setIdx] ? setLimitError(setsData[setIdx]) : null
        if (limitError) {
          toast.error(`Serie ${setIdx + 1}: ${limitError}`)
          return
        }
        const newCount = completedCount + 1
        if (newCount < totalSets && se.restSeconds > 0) {
          onStartRest?.(se.restSeconds)
        }
      }
      onSetComplete?.(setIdx)
    },
    [onSetComplete, onStartRest, completedCount, setsData, totalSets, se.restSeconds]
  )

  const applyWeight = useCallback(
    (newWeight: number) => {
      onWeightChange?.(newWeight)
    },
    [onWeightChange]
  )

  const incrementWeight = useCallback(() => {
    const next = clampSetValue("weight", (localWeight ?? 0) + 2.5)
    setLocalWeight(next)
    applyWeight(next)
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
  const previousSet =
    lastPerformance?.[
      nextIncomplete >= 0 ? nextIncomplete : Math.max(0, lastPerformance.length - 1)
    ] ?? null

  const handlePrimaryAction = useCallback(() => {
    if (nextIncomplete >= 0) {
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
          <CheckCircle className="h-4 w-4 text-gold shrink-0" />
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
              <span className="text-[10px] text-muted-foreground">
                {MUSCLE_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
              </span>
              {machineLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-gold text-[10px] font-medium px-1.5 py-0.5">
                  <Wrench className="h-2.5 w-2.5" />
                  {machineLabel}
                </span>
              )}
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
            {previousSet && isCurrent && (
              <button
                type="button"
                onClick={() => {
                  setLocalWeight(previousSet.weight)
                  onWeightChange?.(previousSet.weight)
                  if (nextIncomplete >= 0) {
                    onSetUpdate?.(nextIncomplete, {
                      weight: previousSet.weight,
                      reps: previousSet.reps,
                    })
                  }
                }}
                className="mt-1 min-h-11 text-xs text-muted-foreground hover:text-foreground"
              >
                Última: {previousSet.weight} kg × {previousSet.reps} · usar
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
              "flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-xs transition-colors",
              isCurrent
                ? "text-gold hover:bg-accent-yellow/10"
                : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
            )}
            aria-label="Ver detalle del ejercicio"
          >
            Detalle <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </ExerciseDetailSheet>
      </div>

      {/* ── Current: weight + sets counter + stepper ── */}
      {isCurrent && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-1 flex-wrap">
            <CounterRow
              label={weightLabel(se.exercise.equipment)}
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

          {onSkip && (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full text-muted-foreground"
              onClick={() => {
                if (window.confirm("¿Saltar este ejercicio? Puedes retomarlo en otra sesión.")) {
                  onSkip()
                }
              }}
            >
              Saltar ejercicio
            </Button>
          )}

          <SetsStepper
            key={`stepper-${totalSets}`}
            setsData={setsData}
            onSetUpdate={onSetUpdate}
            bodyweight={bodyweight}
          />
        </div>
      )}

      {/* ── Completed section: summary ──────────── */}
      {isCompleted && (
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {completedCount}/{totalSets} series ·{" "}
          {bodyweight && !shownWeight ? "peso corporal" : `${shownWeight} kg`}
          {skipped && <span className="text-destructive">Omitido</span>}
        </p>
      )}
    </div>
  )
}
