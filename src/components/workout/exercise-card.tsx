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
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      <div className="inline-flex items-center gap-1 bg-muted/30 rounded-lg px-1.5 py-0.5">
        <button
          type="button"
          aria-label={`Disminuir ${label}`}
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
          aria-label={`Aumentar ${label}`}
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

/* ── Sets Stepper (expandable) ────────────────── */
function SetsStepper({
  setsData,
  onSetToggle,
  restActive,
  onSetUpdate,
}: {
  setsData: SetLog[]
  onSetToggle: (setIdx: number) => void
  restActive: boolean
  onSetUpdate?: (setIdx: number, updates: Partial<SetLog>) => void
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
        {setsData.map((set, i) => {
          const prevCompleted = setsData.slice(0, i).every((s) => s.completed)
          const isBlocked = !set.completed && !prevCompleted

          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                set.completed && "border-accent-yellow/30 bg-accent-yellow/5",
                isBlocked && "opacity-50"
              )}
            >
              <span className="w-12 shrink-0 text-xs font-medium">Serie {i + 1}</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={set.reps}
                disabled={set.completed || isBlocked}
                onChange={(e) =>
                  onSetUpdate?.(i, { reps: Math.max(0, Number(e.target.value) || 0) })
                }
                className="h-10 w-16 text-center text-base"
                aria-label={`Reps serie ${i + 1}`}
              />
              <span className="text-xs text-muted-foreground">reps</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={set.weight}
                disabled={set.completed || isBlocked}
                onChange={(e) =>
                  onSetUpdate?.(i, { weight: Math.max(0, Number(e.target.value) || 0) })
                }
                className="h-10 w-20 text-center text-base"
                aria-label={`Peso serie ${i + 1}`}
              />
              <span className="text-xs text-muted-foreground">kg</span>
              <Button
                type="button"
                size="sm"
                variant={set.completed ? "secondary" : "outline"}
                className="ml-auto h-11 min-w-11"
                disabled={isBlocked}
                onClick={() => onSetToggle(i)}
                aria-label={set.completed ? `Desmarcar serie ${i + 1}` : `Completar serie ${i + 1}`}
              >
                {set.completed ? <Check className="h-4 w-4" /> : "OK"}
              </Button>
            </div>
          )
        })}
      </div>

      {restActive && (
        <button
          type="button"
          onClick={() => {
            const nextIncomplete = setsData.findIndex((s) => !s.completed)
            if (nextIncomplete >= 0) onSetToggle(nextIncomplete)
          }}
          className="mt-2 min-h-11 w-full rounded-lg text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Saltar descanso
        </button>
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
  const [perSetRestActive, setPerSetRestActive] = useState(false)

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
  }, [])

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearTimeout(restIntervalRef.current)
    }
  }, [])

  const handleToggleSet = useCallback(
    (setIdx: number) => {
      clearPerSetRest()
      const isAlreadyCompleted = setsData[setIdx]?.completed ?? false
      if (!isAlreadyCompleted) {
        const newCount = completedCount + 1
        if (newCount < totalSets && se.restSeconds > 0) {
          setPerSetRestActive(true)
          restIntervalRef.current = setTimeout(() => {
            restIntervalRef.current = null
            setPerSetRestActive(false)
          }, se.restSeconds * 1000)
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
              <span className="text-[10px] text-muted-foreground">
                {MUSCLE_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
              </span>
              {machineLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5">
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
                className="mt-1 text-[10px] text-muted-foreground hover:text-foreground"
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
          </div>

          {/* Continue button */}
          {onContinue && (
            <div>
              <Button onClick={handlePrimaryAction} size="sm" className="w-full gap-2">
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
            onSetToggle={(setIdx) => handleToggleSet(setIdx)}
            restActive={perSetRestActive}
            onSetUpdate={onSetUpdate}
          />
        </div>
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
