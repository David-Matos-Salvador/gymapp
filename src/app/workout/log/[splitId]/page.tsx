"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSound } from "@/hooks/use-sound"
import { useWorkoutSession } from "@/hooks/use-workout-session"
import { useWorkoutStore } from "@/stores/workout-store"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CelebrationOverlay } from "@/components/workout/celebration-overlay"
import { ExerciseCard } from "@/components/workout/exercise-card"
import { ArrowLeft, Save, Dumbbell, Timer, Play, Trophy, ChevronDown, Pause, SkipForward } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { SplitExercise, SplitData } from "@/types/exercise"

const PHASE_LABELS: Record<string, string> = {
  prepare: "Preparado",
  warmup: "Calentamiento",
  active: "En acción",
  cooldown: "Enfriamiento",
  done: "Completado",
}

export default function LogWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const { play } = useSound()
  const splitId = params.splitId as string
  const store = useWorkoutStore()
  const [split, setSplit] = useState<SplitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState({
    weeklyCompleted: 0, weeklyTarget: 0, weeklyStreak: 0, bestStreak: 0,
  })
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([])
  const dragIdx = useRef<number | null>(null)
  const finishTriggered = useRef(false)

  const {
    phase, currentExerciseIdx, completedExercises, elapsedSeconds, elapsedFormatted,
    restRemaining, isResting, isRestPaused,
    startWorkout, markExerciseComplete, finishWorkout, playSound, skipRest, pauseRest, resumeRest, cleanup,
  } = useWorkoutSession({
    totalExercises: split?.exercises.length ?? 0,
    restSeconds: 60,
    onComplete: () => {
      fetchCelebrationData()
      setShowCelebration(true)
    },
  })

  useEffect(() => {
    fetch(`/api/routine-splits/${splitId}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.split as SplitData
        setSplit(s)

        const snapshot = useWorkoutStore.getState()
        if (snapshot.phase !== "prepare" && snapshot.phase !== "done" && snapshot.splitId === splitId) {
          setExerciseOrder(s.exercises.map((e) => e.exerciseId))
          setLoading(false)
          return
        }

        const initialSets: Record<string, import("@/stores/workout-store").SetLog[]> = {}
        s.exercises.forEach((se) => {
          initialSets[se.exerciseId] = Array.from({ length: se.sets }, (_, i) => ({
            exerciseId: se.exerciseId, exerciseName: se.exercise.name,
            setNumber: i + 1, reps: 0, weight: 0, completed: false,
          }))
        })
        setExerciseOrder(s.exercises.map((e) => e.exerciseId))
        useWorkoutStore.getState().setSplitId(s.id)
        useWorkoutStore.getState().setTotalExercises(s.exercises.length)
        useWorkoutStore.getState().setSetsData(initialSets)
        setLoading(false)
      })
      .catch(() => { toast.error("Error al cargar el entrenamiento"); setLoading(false) })
  }, [splitId])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  useEffect(() => {
    if (phase === "warmup") finishTriggered.current = false
  }, [phase])

  useEffect(() => {
    if (phase === "done" || phase === "prepare") return
    if (finishTriggered.current) return
    if (completedExercises >= (split?.exercises.length ?? 0) && split) {
      finishTriggered.current = true
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedExercises, split])

  async function fetchCelebrationData() {
    try {
      const res = await fetch("/api/weekly-progress")
      const data = await res.json()
      setCelebrationData({
        weeklyCompleted: data.weeklyCompleted ?? completedExercises,
        weeklyTarget: data.weeklyTarget ?? 3,
        weeklyStreak: data.weeklyStreak ?? 0,
        bestStreak: data.bestStreak ?? 0,
      })
    } catch {
      setCelebrationData({ weeklyCompleted: completedExercises, weeklyTarget: 3, weeklyStreak: 0, bestStreak: 0 })
    }
  }

  const setsData = store.setsData

  function handleToggleComplete(exerciseId: string) {
    const current = store.setsData[exerciseId] ?? []
    const allAreCompleted = current.length > 0 && current.every((s) => s.completed)

    if (!allAreCompleted) {
      const updated = current.map((s) => ({ ...s, completed: true }))
      store.setSetsData({ ...store.setsData, [exerciseId]: updated })
      store.addCompletedExercise(exerciseId)

      play("select")

      const exerciseIdx = split?.exercises.findIndex((e) => e.exerciseId === exerciseId) ?? -1
      if (exerciseIdx >= 0 && exerciseIdx === currentExerciseIdx) {
        setTimeout(() => markExerciseComplete(exerciseIdx), 200)
      }
    } else {
      const updated = current.map((s) => ({ ...s, completed: false }))
      store.setSetsData({ ...store.setsData, [exerciseId]: updated })
      store.setCompletedExerciseIds(
        store.completedExerciseIds.filter((id) => id !== exerciseId)
      )
      play("delete")
    }
  }

  async function handleSubmit() {
    const allSets = Object.values(store.setsData).flat().filter((s) => s.completed)
    if (allSets.length === 0) { toast.error("Completá al menos una serie"); return }
    setSaving(true)
    const body = {
      splitId,
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
    } else {
      const err = await res.json()
      playSound("error")
      toast.error(err.error || "Error al guardar")
      setSaving(false)
    }
  }

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(idx))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    const fromIdx = dragIdx.current
    if (fromIdx === null || fromIdx === dropIdx) return
    setExerciseOrder((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIdx, 1)
      updated.splice(dropIdx, 0, moved)
      return updated
    })
    dragIdx.current = null
  }, [])

  const isActive = phase !== "prepare" && phase !== "done"
  const totalExercises = split?.exercises.length ?? 0
  const completedIds = store.completedExerciseIds

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!split) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl text-center">
          <p className="text-muted-foreground py-12">Entrenamiento no encontrado</p>
          <Button variant="outline" onClick={() => router.back()}>Volver</Button>
        </div>
      </AppShell>
    )
  }

  const exercises = split.exercises
  const getExercise = (id: string) => exercises.find((e) => e.exerciseId === id)
  const activeExercises = exerciseOrder
    .map((id) => getExercise(id))
    .filter((se): se is SplitExercise => !!se && !completedIds.includes(se.exerciseId))
  const doneExercises = exerciseOrder
    .map((id) => getExercise(id))
    .filter((se): se is SplitExercise => !!se && completedIds.includes(se.exerciseId))

  return (
    <AppShell>
      <CelebrationOverlay
        open={showCelebration}
        weeklyCompleted={celebrationData.weeklyCompleted}
        weeklyTarget={celebrationData.weeklyTarget}
        weeklyStreak={celebrationData.weeklyStreak}
        bestStreak={celebrationData.bestStreak}
        onClose={() => {
          setShowCelebration(false)
          store.resetWorkout()
          router.push("/rutina")
          router.refresh()
        }}
      />

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl space-y-5">
        <button onClick={() => { play("click"); cleanup(); router.back() }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-accent-yellow" /> {split.name}
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
          {split.description && <p className="text-muted-foreground mt-1">{split.description}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{split.plan?.name}</p>
        </div>

        {isActive && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums font-medium">{elapsedFormatted}</span>
          </div>
        )}

        {phase === "prepare" && (
          <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-xl bg-accent-yellow/5 border border-accent-yellow/30">
            <p className="text-sm text-muted-foreground">
              {totalExercises} ejercicios · ~{Math.round(totalExercises * 2.5)} min estimados
            </p>
            <Button onClick={startWorkout} className="gap-2">
              <Play className="h-4 w-4" /> Iniciar entrenamiento
            </Button>
          </div>
        )}

        {phase !== "done" && (
          <div className="space-y-2">
            {isResting && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-accent-yellow/20 bg-accent-yellow/5 animate-in fade-in slide-in-from-top-2">
                <svg width="36" height="36" viewBox="0 0 120 120" className="-rotate-90 shrink-0">
                  <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" stroke="currentColor" className="text-muted/20" />
                  <circle
                    cx="60" cy="60" r="54" fill="none" strokeWidth="6"
                    stroke="currentColor" strokeLinecap="round"
                    className={restRemaining <= 5 ? "text-red-500" : restRemaining <= 10 ? "text-amber-500" : "text-accent-yellow"}
                    style={{
                      strokeDasharray: 2 * Math.PI * 54,
                      strokeDashoffset: (2 * Math.PI * 54) * (1 - restRemaining / 60),
                    }}
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "font-mono text-lg font-bold tabular-nums",
                    restRemaining <= 5 && "animate-pulse",
                  )}>
                    {String(Math.floor(restRemaining / 60)).padStart(2, "0")}:{String(restRemaining % 60).padStart(2, "0")}
                  </span>
                  <p className="text-xs text-muted-foreground">descanso</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={isRestPaused ? resumeRest : pauseRest}
                    className="p-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors"
                    aria-label={isRestPaused ? "Reanudar" : "Pausar"}
                  >
                    {isRestPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={skipRest}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-input bg-background hover:bg-muted transition-colors"
                  >
                    <SkipForward className="h-3 w-3" />
                    Saltar
                  </button>
                </div>
              </div>
            )}

            {activeExercises.map((se, idx) => {
              const exerciseSets = setsData[se.exerciseId] ?? []
              const completedCount = exerciseSets.filter((s) => s.completed).length
              const allCompleted = exerciseSets.length > 0 && completedCount === exerciseSets.length
              const origIdx = exercises.findIndex((e) => e.exerciseId === se.exerciseId)
              const isCurrent = origIdx === currentExerciseIdx
              const wasCompleted = origIdx < currentExerciseIdx

              return (
                <div
                  key={se.exerciseId}
                  draggable={!allCompleted}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                >
                  <ExerciseCard
                    se={se}
                    setsData={exerciseSets}
                    isCurrent={isCurrent}
                    isActive={isActive}
                    isCompleted={wasCompleted}
                    allCompleted={allCompleted}
                    isInCompletedSection={false}
                    onToggleComplete={() => handleToggleComplete(se.exerciseId)}
                    dragHandleProps={{}}
                    onSetUpdate={(setIdx, updates) => {
                      store.updateSet(se.exerciseId, setIdx, updates)
                    }}
                    onSetComplete={(setIdx) => {
                      const updated = [...exerciseSets]
                      updated[setIdx] = { ...updated[setIdx], completed: true }
                      store.setSetsData({ ...store.setsData, [se.exerciseId]: updated })
                    }}
                    onWeightChange={(weight) => {
                      store.updateAllSetWeights(se.exerciseId, weight)
                    }}
                  />
                </div>
              )
            })}

            {doneExercises.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-4 pb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <ChevronDown className="h-3 w-3" /> Completados
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {doneExercises.map((se) => (
                  <ExerciseCard
                    key={se.exerciseId}
                    se={se}
                    setsData={setsData[se.exerciseId] ?? []}
                    isCurrent={false}
                    isActive={isActive}
                    isCompleted={true}
                    allCompleted={true}
                    isInCompletedSection={true}
                    onToggleComplete={() => handleToggleComplete(se.exerciseId)}
                    onSetUpdate={(setIdx, updates) => {
                      store.updateSet(se.exerciseId, setIdx, updates)
                    }}
                    onSetComplete={(setIdx) => {
                      const sets = [ ...(store.setsData[se.exerciseId] ?? []) ]
                      sets[setIdx] = { ...sets[setIdx], completed: true }
                      store.setSetsData({ ...store.setsData, [se.exerciseId]: sets })
                    }}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {phase === "done" && !showCelebration && (
          <Card className="bg-accent-yellow/5 border-accent-yellow/30 text-center">
            <CardContent className="py-8 space-y-3">
              <Trophy className="h-12 w-12 text-accent-yellow mx-auto" />
              <h2 className="text-xl font-bold">Entrenamiento completado</h2>
              <p className="text-sm text-muted-foreground">
                Duración: {elapsedFormatted} · {completedExercises} ejercicios completados
              </p>
              <div className="flex justify-center gap-1 py-2">
                {["🎉", "💪", "🔥", "⚡"].map((emoji, i) => (
                  <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>
                    {emoji}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isActive && (
          <Card>
            <CardContent className="py-4">
              <textarea
                rows={2}
                placeholder="Notas sobre el entrenamiento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 resize-none"
              />
            </CardContent>
          </Card>
        )}

        {isActive && (
          <div className="flex gap-3 justify-end pb-20">
            <Button variant="outline" onClick={() => { play("click"); cleanup(); router.back() }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Finalizar entrenamiento"}
            </Button>
          </div>
        )}

        {phase === "prepare" && (
          <div className="flex gap-3 justify-end pb-20">
            <Button variant="outline" onClick={() => { play("click"); router.back() }}>Volver</Button>
          </div>
        )}

        {phase === "done" && !showCelebration && (
          <div className="flex gap-3 justify-end pb-20">
            <Button variant="outline" onClick={() => { store.resetWorkout(); router.push("/rutina"); router.refresh() }}>
              Ir al inicio
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}