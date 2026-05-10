"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X, Plus, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SetLog } from "@/stores/workout-store"

interface Exercise { id: string; name: string; muscleGroup: string; equipment: string; imageUrl?: string | null }
interface SplitExercise { id: string; exerciseId: string; sets: number; reps: string; weight: number; restSeconds: number; order: number; exercise: Exercise }

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "B\u00edceps",
  TRICEPS: "Tr\u00edceps", LEGS: "Piernas", GLUTES: "Gl\u00fateos", ABS: "Abdominales",
  CALVES: "Pantorrillas", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

interface ExerciseCardProps {
  se: SplitExercise
  setsData: SetLog[]
  isCurrent: boolean
  isActive: boolean
  isCompleted: boolean
  allCompleted: boolean
  isInCompletedSection: boolean
  onToggleSet: (setIdx: number, currentlyCompleted: boolean) => void
  onUpdateSet: (setIdx: number, field: string, value: number | boolean) => void
  onAddSet: () => void
  onRemoveSet: (setIdx: number) => void
}

export function ExerciseCard({
  se,
  setsData,
  isCurrent,
  isActive,
  isCompleted,
  allCompleted,
  isInCompletedSection,
  onToggleSet,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}: ExerciseCardProps) {
  const exerciseRef = useRef<HTMLDivElement>(null)
  const completedCount = setsData.filter((s) => s.completed).length

  useEffect(() => {
    if (isCurrent && isActive && exerciseRef.current && !isInCompletedSection) {
      exerciseRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [isCurrent, isActive, isInCompletedSection])

  return (
    <Card
      ref={exerciseRef}
      className={cn(
        "transition-all duration-300",
        isCurrent && isActive && !isInCompletedSection && "ring-2 ring-gym-green/40 shadow-md shadow-gym-green/5",
        isCompleted && isActive && !isInCompletedSection && "opacity-60",
        allCompleted && isActive && !isInCompletedSection && "border-gym-green/20",
        isInCompletedSection && "opacity-50 border-gym-green/10 bg-muted/30"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allCompleted && isActive && (
              <Check className="h-5 w-5 text-gym-green" />
            )}
            <span className={cn(isInCompletedSection && "line-through decoration-gym-green/30")}>
              {se.exercise.name}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {MUSCLE_GROUP_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
            </span>
            {isCurrent && isActive && !isInCompletedSection && (
              <span className="inline-flex rounded-full bg-gym-green/10 px-2 py-0.5 text-[10px] font-medium text-gym-green">
                Actual
              </span>
            )}
          </div>
          <span className="text-xs font-normal text-muted-foreground">
            {completedCount}/{setsData.length} series
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isInCompletedSection ? (
          <div className="space-y-1.5">
            {setsData.map((set, setIdx) => (
              <div key={setIdx} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-8 text-center">#{set.setNumber}</span>
                <span>{set.reps} reps</span>
                {set.weight > 0 && <span>· {set.weight}kg</span>}
                <Check className="h-3 w-3 text-gym-green ml-auto" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_40px_32px] gap-2 text-[10px] text-muted-foreground px-1">
              <span>Set</span><span>Reps</span><span>Peso (kg)</span><span /><span />
            </div>
            {setsData.map((set, setIdx) => (
              <div key={`${se.exerciseId}-${setIdx}`} className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[40px_1fr_1fr_40px_32px] gap-2 items-center">
                <span className="text-xs text-muted-foreground text-center hidden sm:inline">{set.setNumber}</span>
                <Input
                  type="number" min={0} value={set.reps}
                  onChange={(e) => onUpdateSet(setIdx, "reps", Number(e.target.value))}
                  className="h-8 text-sm" placeholder="Reps"
                />
                <Input
                  type="number" min={0} step={2.5} value={set.weight}
                  onChange={(e) => onUpdateSet(setIdx, "weight", Number(e.target.value))}
                  className="h-8 text-sm" placeholder="kg"
                />
                <button
                  type="button"
                  onClick={() => onToggleSet(setIdx, set.completed)}
                  className={set.completed
                    ? "h-8 w-8 flex items-center justify-center rounded-lg border bg-gym-green/10 border-gym-green text-gym-green transition-colors hover:bg-gym-green/20"
                    : "h-8 w-8 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:border-foreground/30 transition-colors"
                  }
                >
                  {set.completed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSet(setIdx)}
                  className="h-8 w-8 hidden sm:flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onAddSet}>
              <Plus className="h-4 w-4" /> A\u00f1adir set
            </Button>
            {!isCompleted && isActive && se.restSeconds > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  Descanso {se.restSeconds}s
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
