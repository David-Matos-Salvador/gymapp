"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { useWorkoutSession } from "@/hooks/use-workout-session"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Plus, ArrowLeft, Save, Dumbbell, Timer, Play, Trophy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  CHEST: "Pecho", BACK: "Espalda", SHOULDERS: "Hombros", BICEPS: "Bíceps",
  TRICEPS: "Tríceps", LEGS: "Piernas", GLUTES: "Glúteos", ABS: "Abdominales",
  CALVES: "Pantorrillas", FOREARMS: "Antebrazos", TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo", CARDIO: "Cardio",
}

const PHASE_LABELS: Record<string, string> = {
  prepare: "Preparado",
  warmup: "Calentamiento",
  active: "En acción",
  cooldown: "Enfriamiento",
  done: "Completado",
}

interface Exercise { id: string; name: string; muscleGroup: string; equipment: string }
interface RoutineExercise { id: string; exerciseId: string; sets: number; reps: number; weight: number; restSeconds: number; order: number; exercise: Exercise }
interface Routine { id: string; name: string; description: string | null; exercises: RoutineExercise[] }
interface SetLog { exerciseId: string; exerciseName: string; setNumber: number; reps: number; weight: number; completed: boolean }

export default function LogWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const { play } = useSound()
  const routineId = params.routineId as string

  const [routine, setRoutine] = useState<Routine | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")
  const [setsData, setSetsData] = useState<Record<string, SetLog[]>>({})
  const [showConfetti, setShowConfetti] = useState(false)

  const {
    phase,
    currentExerciseIdx,
    completedExercises,
    elapsedSeconds,
    elapsedFormatted,
    restRemaining,
    restFormatted,
    isResting,
    startWorkout,
    markExerciseComplete,
    finishWorkout,
    playSound,
    skipRest,
    cleanup,
  } = useWorkoutSession({
    totalExercises: routine?.exercises.length ?? 0,
    restSeconds: 60,
    onComplete: () => setShowConfetti(true),
  })

  useEffect(() => {
    fetch(`/api/routines/${routineId}`)
      .then((r) => r.json())
      .then((data) => {
        const r = data.routine
        setRoutine(r)
        const initialSets: Record<string, SetLog[]> = {}
        r.exercises.forEach((re: RoutineExercise) => {
          initialSets[re.exerciseId] = Array.from({ length: re.sets }, (_, i) => ({
            exerciseId: re.exerciseId, exerciseName: re.exercise.name,
            setNumber: i + 1, reps: re.reps, weight: re.weight, completed: true,
          }))
        })
        setSetsData(initialSets)
        setLoading(false)
      })
      .catch(() => { toast.error("Error al cargar la rutina"); setLoading(false) })
  }, [routineId])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  function updateSet(exerciseId: string, setIdx: number, field: keyof SetLog, value: number | boolean) {
    setSetsData((prev) => ({
      ...prev, [exerciseId]: prev[exerciseId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s),
    }))
  }

  function toggleSetCompleted(exerciseId: string, setIdx: number, currentlyCompleted: boolean) {
    const wasPlaying = phase !== "prepare" && phase !== "done"

    setSetsData((prev) => {
      const updated = {
        ...prev,
        [exerciseId]: prev[exerciseId].map((s, i) =>
          i === setIdx ? { ...s, completed: !currentlyCompleted } : s
        ),
      }

      if (wasPlaying) {
        playSound(!currentlyCompleted ? "setComplete" : "toggle")

        const sets = updated[exerciseId]
        const allCompleted = sets.every((s) => s.completed)
        if (allCompleted) {
          const exerciseIdx = routine?.exercises.findIndex((e) => e.exerciseId === exerciseId) ?? -1
          if (exerciseIdx >= 0 && exerciseIdx === currentExerciseIdx) {
            setTimeout(() => markExerciseComplete(exerciseIdx), 200)
          }
        }
      }

      return updated
    })
  }

  function addSet(exerciseId: string, exercise: Exercise) {
    play("select")
    setSetsData((prev) => {
      const current = prev[exerciseId] ?? []
      return {
        ...prev, [exerciseId]: [...current, {
          exerciseId, exerciseName: exercise.name,
          setNumber: current.length + 1,
          reps: current.length > 0 ? current[current.length - 1].reps : 10,
          weight: current.length > 0 ? current[current.length - 1].weight : 0,
          completed: true,
        }],
      }
    })
  }

  function removeSet(exerciseId: string, setIdx: number) {
    play("delete")
    setSetsData((prev) => ({
      ...prev, [exerciseId]: prev[exerciseId].filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, setNumber: i + 1 })),
    }))
  }

  async function handleSubmit() {
    const allSets = Object.values(setsData).flat().filter((s) => s.reps > 0)
    if (allSets.length === 0) { toast.error("Completa al menos una serie con repeticiones"); return }
    setSaving(true)
    const body = {
      routineId,
      duration: phase === "prepare" ? undefined : Math.max(1, Math.round(elapsedSeconds / 60)),
      notes: notes.trim() || undefined,
      sets: allSets.map((s) => ({
        exerciseId: s.exerciseId, exerciseName: s.exerciseName,
        setNumber: s.setNumber, reps: s.reps, weight: s.weight, completed: s.completed,
      })),
    }
    const res = await fetch("/api/workout-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) {
      finishWorkout()
      play("success")
      toast.success("Entrenamiento registrado")
      setTimeout(() => {
        router.push("/rutina")
        router.refresh()
      }, 2000)
    } else {
      const err = await res.json()
      playSound("error")
      toast.error(err.error || "Error al guardar")
      setSaving(false)
    }
  }

  const progress = routine ? Math.round((completedExercises / routine.exercises.length) * 100) : 0
  const isActive = phase !== "prepare" && phase !== "done"
  const totalExercises = routine?.exercises.length ?? 0

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!routine) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl text-center">
          <p className="text-muted-foreground py-12">Rutina no encontrada</p>
          <Button variant="outline" onClick={() => router.back()}>Volver</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        {/* Header */}
        <button onClick={() => { play("click"); cleanup(); router.back() }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-gym-green" /> {routine.name}
            </h1>
            {isActive && (
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
                phase === "warmup" && "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400",
                phase === "active" && "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400",
                phase === "cooldown" && "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400",
              )}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
                {PHASE_LABELS[phase]}
              </span>
            )}
          </div>
          {routine.description && <p className="text-muted-foreground mt-1">{routine.description}</p>}
        </div>

        {/* Workout Timer Bar */}
        {isActive && (
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-lg font-semibold">{elapsedFormatted}</span>
            </div>
            <div className="flex-1 mx-4">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    phase === "warmup" && "bg-amber-500",
                    phase === "active" && "bg-gym-green",
                    phase === "cooldown" && "bg-blue-500",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right mt-1">
                {completedExercises}/{totalExercises} ejercicios
              </p>
            </div>
          </div>
        )}

        {/* Rest Timer Overlay */}
        {isResting && (
          <div className="p-6 rounded-xl bg-gym-green/5 border-2 border-gym-green/30 text-center space-y-2 animate-in fade-in slide-in-from-top-4">
            <p className="text-sm text-muted-foreground font-medium">Descanso</p>
            <p className={cn(
              "font-mono text-4xl font-bold tabular-nums",
              restRemaining <= 3 ? "text-gym-green animate-pulse" : "text-gym-green/70"
            )}>
              {restFormatted}
            </p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={skipRest}>
              Saltar descanso
            </Button>
          </div>
        )}

        {/* Start Button (show only in prepare phase) */}
        {phase === "prepare" && (
          <Card className="bg-gym-green/5 border-gym-green/30">
            <CardContent className="py-6 text-center space-y-3">
              <Play className="h-10 w-10 text-gym-green mx-auto" />
              <p className="text-sm text-muted-foreground">
                {totalExercises} ejercicios · ~{Math.round(totalExercises * 2.5)} min estimados
              </p>
              <Button size="lg" className="gap-2" onClick={startWorkout}>
                <Play className="h-4 w-4" /> Iniciar entrenamiento
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Exercise List (shown only when active or prepare) */}
        {phase !== "done" && routine.exercises.map((re, idx) => {
          const exerciseSets = setsData[re.exerciseId] ?? []
          const completedCount = exerciseSets.filter((s) => s.completed).length
          const allCompleted = exerciseSets.length > 0 && completedCount === exerciseSets.length
          const isCurrent = idx === currentExerciseIdx
          const isCompleted = idx < currentExerciseIdx

          return (
            <Card
              key={re.exerciseId}
              className={cn(
                "transition-all duration-300",
                isCurrent && isActive && "ring-2 ring-gym-green/40 shadow-md shadow-gym-green/5",
                isCompleted && isActive && "opacity-60",
                allCompleted && isActive && "border-gym-green/20",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {allCompleted && isActive && (
                      <Check className="h-5 w-5 text-gym-green" />
                    )}
                    <span>{re.exercise.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {MUSCLE_GROUP_LABELS[re.exercise.muscleGroup] ?? re.exercise.muscleGroup}
                    </span>
                    {isCurrent && isActive && (
                      <span className="inline-flex rounded-full bg-gym-green/10 px-2 py-0.5 text-[10px] font-medium text-gym-green">
                        Actual
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">
                    {completedCount}/{exerciseSets.length} series
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="hidden sm:grid sm:grid-cols-[40px_1fr_1fr_40px_32px] gap-2 text-[10px] text-muted-foreground px-1">
                  <span>Set</span><span>Reps</span><span>Peso (kg)</span><span /><span />
                </div>
                {exerciseSets.map((set, setIdx) => (
                  <div key={`${re.exerciseId}-${setIdx}`} className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[40px_1fr_1fr_40px_32px] gap-2 items-center">
                    <span className="text-xs text-muted-foreground text-center hidden sm:inline">{set.setNumber}</span>
                    <Input
                      type="number" min={0} value={set.reps}
                      onChange={(e) => updateSet(re.exerciseId, setIdx, "reps", Number(e.target.value))}
                      className="h-8 text-sm" placeholder="Reps"
                    />
                    <Input
                      type="number" min={0} step={2.5} value={set.weight}
                      onChange={(e) => updateSet(re.exerciseId, setIdx, "weight", Number(e.target.value))}
                      className="h-8 text-sm" placeholder="kg"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSetCompleted(re.exerciseId, setIdx, set.completed)}
                      className={set.completed
                        ? "h-8 w-8 flex items-center justify-center rounded-lg border bg-gym-green/10 border-gym-green text-gym-green transition-colors hover:bg-gym-green/20"
                        : "h-8 w-8 flex items-center justify-center rounded-lg border border-input text-muted-foreground hover:border-foreground/30 transition-colors"
                      }
                    >
                      {set.completed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSet(re.exerciseId, setIdx)}
                      className="h-8 w-8 hidden sm:flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => addSet(re.exerciseId, re.exercise)}>
                  <Plus className="h-4 w-4" /> Añadir set
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {/* Workout Complete Celebration */}
        {phase === "done" && (
          <Card className="bg-gym-green/5 border-gym-green/30 text-center">
            <CardContent className="py-8 space-y-3">
              <Trophy className="h-12 w-12 text-gym-green mx-auto" />
              <h2 className="text-xl font-bold">Entrenamiento completado</h2>
              <p className="text-sm text-muted-foreground">
                Duración: {elapsedFormatted} · {completedExercises} ejercicios completados
              </p>
              {showConfetti && (
                <div className="flex justify-center gap-1 py-2">
                  {["🎉", "💪", "🔥", "⚡"].map((emoji, i) => (
                    <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes (shown only when active) */}
        {isActive && (
          <Card>
            <CardContent className="py-4 space-y-2">
              <Label htmlFor="notes" className="text-sm">Notas del entrenamiento</Label>
              <textarea
                id="notes" rows={2} placeholder="Notas sobre el entrenamiento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 resize-none"
              />
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {isActive && (
          <div className="flex gap-3 justify-end pb-4">
            <Button variant="outline" onClick={() => { play("click"); cleanup(); router.back() }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Finalizar entrenamiento"}
            </Button>
          </div>
        )}

        {phase === "prepare" && (
          <div className="flex gap-3 justify-end pb-4">
            <Button variant="outline" onClick={() => { play("click"); router.back() }}>Volver</Button>
          </div>
        )}

        {phase === "done" && (
          <div className="flex gap-3 justify-end pb-4">
            <Button variant="outline" onClick={() => { router.push("/rutina"); router.refresh() }}>Ir al inicio</Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
