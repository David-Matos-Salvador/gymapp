"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWorkoutSession } from "@/hooks/use-workout-session"
import { useWorkoutStore } from "@/stores/workout-store"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CelebrationOverlay } from "@/components/workout/celebration-overlay"
import { ExerciseCard } from "@/components/workout/exercise-card"
import { RestTimer } from "@/components/workout/rest-timer"
import { PHASE_LABELS, PHASE_COLORS } from "@/constants/workout"
import { ArrowLeft, Save, Dumbbell, Timer, Play, Trophy, ChevronDown, Pause, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { SplitExercise, SplitData } from "@/types/exercise"

const LOADING_SKELETON = (
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

export default function LogWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.planId as string
  const splitId = params.splitId as string
  const store = useWorkoutStore()
  const [split, setSplit] = useState<SplitData | null>(null)
  const [gym, setGym] = useState<{ id: string; showMachineNumbers: boolean } | null>(null)
  const [lastPerformance, setLastPerformance] = useState<
    Record<string, { weight: number; reps: number }>
  >({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState({
    weeklyCompleted: 0,
    weeklyTarget: 0,
    weeklyStreak: 0,
    bestStreak: 0,
  })
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([])
  const dragIdx = useRef<number | null>(null)
  const finishTriggered = useRef(false)

  const storeCurrentExerciseIdx = useWorkoutStore((s) => s.currentExerciseIdx)

  const currentRestSeconds = useMemo(() => {
    if (!split || split.exercises.length === 0) return undefined
    return split.exercises[Math.min(storeCurrentExerciseIdx, split.exercises.length - 1)]
      ?.restSeconds
  }, [split, storeCurrentExerciseIdx])

  const {
    phase,
    currentExerciseIdx,
    completedExercises,
    elapsedSeconds,
    elapsedFormatted,
    restRemaining,
    isResting,
    isRestPaused,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    markExerciseComplete,
    finishWorkout,
    skipRest,
    pauseRest,
    resumeRest,
  } = useWorkoutSession({
    totalExercises: split?.exercises.length ?? 0,
    restSeconds: currentRestSeconds,
    onComplete: () => {
      fetchCelebrationData()
      setShowCelebration(true)
    },
  })

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/routine-splits/${splitId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const s = data.split as SplitData
        setSplit(s)
        setGym((data.gym as { id: string; showMachineNumbers: boolean } | null) ?? null)
        setLastPerformance(
          (data.lastPerformance ?? {}) as Record<string, { weight: number; reps: number }>
        )

        const snapshot = useWorkoutStore.getState()
        const exerciseIdSet = new Set(s.exercises.map((e) => e.exerciseId))
        const completedMatch = snapshot.completedExerciseIds.every((id) => exerciseIdSet.has(id))
        const validResume =
          snapshot.phase !== "prepare" &&
          snapshot.phase !== "done" &&
          snapshot.splitId === splitId &&
          snapshot.totalExercises === s.exercises.length &&
          snapshot.currentExerciseIdx < s.exercises.length &&
          completedMatch

        if (validResume) {
          setExerciseOrder(s.exercises.map((e) => e.exerciseId))
          setLoading(false)
          return
        }

        useWorkoutStore.getState().resetWorkout()

        const initialSets: Record<string, import("@/stores/workout-store").SetLog[]> = {}
        s.exercises.forEach((se) => {
          const defaultReps = parseInt(se.reps) || 0
          const defaultWeight = se.weight
          initialSets[se.exerciseId] = Array.from({ length: se.sets }, (_, i) => ({
            exerciseId: se.exerciseId,
            exerciseName: se.exercise.name,
            setNumber: i + 1,
            reps: defaultReps,
            weight: defaultWeight,
            restSeconds: se.restSeconds,
            completed: false,
          }))
        })
        setExerciseOrder(s.exercises.map((e) => e.exerciseId))
        useWorkoutStore.getState().setSplitId(s.id)
        useWorkoutStore.getState().setTotalExercises(s.exercises.length)
        useWorkoutStore.getState().setSetsData(initialSets)
        setLoading(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          toast.error("Error al cargar el entrenamiento")
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [splitId])

  useEffect(() => {
    if (phase === "warmup") finishTriggered.current = false
  }, [phase])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) pauseWorkout()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [pauseWorkout])

  const handleSubmit = useCallback(async () => {
    if (saving) return
    const allSets = Object.values(store.setsData)
      .flat()
      .filter((s) => s.completed)
    if (allSets.length === 0) {
      toast.error("Completa al menos una serie")
      return
    }
    setSaving(true)
    const body = {
      splitId,
      duration: Math.max(1, Math.round(elapsedSeconds / 60)),
      notes: notes.trim() || undefined,
      sets: allSets.map((s) => ({
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        restSeconds: s.restSeconds,
        completed: s.completed,
      })),
    }
    const res = await fetch("/api/workout-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      finishWorkout()
      toast.success("Entrenamiento registrado")
      setSaving(false)
    } else {
      const err = await res.json()
      toast.error(err.error || "Error al guardar")
      setSaving(false)
    }
  }, [store, splitId, elapsedSeconds, notes, finishWorkout, saving])

  useEffect(() => {
    if (phase === "done" || phase === "prepare") return
    if (finishTriggered.current) return
    if (completedExercises >= (split?.exercises.length ?? 0) && split) {
      finishTriggered.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setCelebrationData({
        weeklyCompleted: completedExercises,
        weeklyTarget: 3,
        weeklyStreak: 0,
        bestStreak: 0,
      })
    }
  }

  const completedIds = store.completedExerciseIds
  const completedIdSet = useMemo(() => new Set(completedIds), [completedIds])

  const exerciseMap = useMemo(() => {
    if (!split) return new Map<string, { se: SplitExercise; origIdx: number }>()
    const map = new Map<string, { se: SplitExercise; origIdx: number }>()
    split.exercises.forEach((se, i) => map.set(se.exerciseId, { se, origIdx: i }))
    return map
  }, [split])

  const { activeExercises, doneExercises } = useMemo(() => {
    const active: SplitExercise[] = []
    const done: SplitExercise[] = []
    for (const id of exerciseOrder) {
      const entry = exerciseMap.get(id)
      if (!entry) continue
      if (completedIdSet.has(id)) {
        done.push(entry.se)
      } else {
        active.push(entry.se)
      }
    }
    return { activeExercises: active, doneExercises: done }
  }, [exerciseOrder, exerciseMap, completedIdSet])

  const handleContinueExercise = useCallback(
    (exerciseId: string) => {
      const entry = exerciseMap.get(exerciseId)
      if (!entry) return
      store.addCompletedExercise(exerciseId)
      if (entry.origIdx === currentExerciseIdx) {
        setTimeout(() => {
          const { phase: p } = useWorkoutStore.getState()
          if (p === "done") return
          markExerciseComplete(entry.origIdx)
        }, 50)
      }
    },
    [exerciseMap, currentExerciseIdx, store, markExerciseComplete]
  )

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
  const isPaused = store.isPaused
  const totalExercises = split?.exercises.length ?? 0
  const setsData = store.setsData
  const hasCompletedSet = Object.values(setsData).some((sets) => sets.some((set) => set.completed))

  if (loading) return LOADING_SKELETON

  if (!split) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl text-center">
          <p className="text-muted-foreground py-12">Entrenamiento no encontrado</p>
          <Button variant="outline" onClick={() => router.push(`/rutinas/${planId}`)}>
            Volver
          </Button>
        </div>
      </AppShell>
    )
  }

  const planName = split.plan?.name ?? "Rutina"
  const phaseColor = PHASE_COLORS[phase]

  return (
    <AppShell immersive>
      <CelebrationOverlay
        open={showCelebration}
        weeklyCompleted={celebrationData.weeklyCompleted}
        weeklyTarget={celebrationData.weeklyTarget}
        weeklyStreak={celebrationData.weeklyStreak}
        bestStreak={celebrationData.bestStreak}
        onClose={() => {
          setShowCelebration(false)
          store.resetWorkout()
          router.push(`/rutinas/${planId}`)
          router.refresh()
        }}
      />

      <div
        className={cn(
          "container mx-auto max-w-2xl space-y-5 px-4 py-4 pb-28 md:py-8",
          showCelebration && "hidden"
        )}
      >
        <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                pauseWorkout()
                router.push(`/rutinas/${planId}`)
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Salir
            </Button>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{split.name}</span>
            {isActive && (
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {elapsedFormatted}
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-accent-yellow" /> {split.name}
            </h1>
            {isActive && phaseColor && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
                  phaseColor.bg,
                  phaseColor.border,
                  phaseColor.text
                )}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
                {PHASE_LABELS[phase]}
              </span>
            )}
          </div>
          {split.description && <p className="text-muted-foreground mt-1">{split.description}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{planName}</p>
        </div>

        {isActive && isPaused && (
          <Card className="border-accent-yellow/30 bg-accent-yellow/5">
            <CardContent className="flex flex-wrap items-center gap-3 py-3">
              <Pause className="h-5 w-5 text-accent-yellow" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Entrenamiento en pausa</p>
                <p className="text-xs text-muted-foreground">
                  El cronómetro está detenido. Reanudá cuando estés listo.
                </p>
              </div>
              <Button size="sm" onClick={resumeWorkout}>
                <Play className="mr-1 h-3.5 w-3.5" /> Reanudar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!window.confirm("¿Descartar este entrenamiento? Se perderán las series."))
                    return
                  store.resetWorkout()
                  router.push(`/rutinas/${planId}`)
                }}
              >
                Descartar
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "prepare" && (
          <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-xl bg-accent-yellow/5 border border-accent-yellow/30">
            <p className="text-sm text-muted-foreground">
              {totalExercises} ejercicios · ~
              {split.estimatedDuration ?? Math.round(totalExercises * 2.5)} min estimados
            </p>
            <Button onClick={startWorkout} className="gap-2">
              <Play className="h-4 w-4" /> Iniciar entrenamiento
            </Button>
          </div>
        )}

        {isActive && !isPaused && (
          <div className="space-y-2">
            {isResting && (
              <RestTimer
                remaining={restRemaining}
                total={store.restTotalDuration}
                status={isRestPaused ? "paused" : "running"}
                onPause={pauseRest}
                onResume={resumeRest}
                onSkip={skipRest}
              />
            )}

            {activeExercises.map((se, idx) => {
              const exerciseSets = setsData[se.exerciseId] ?? []
              const entry = exerciseMap.get(se.exerciseId)
              const appearance =
                entry?.origIdx === currentExerciseIdx ? ("current" as const) : ("pending" as const)

              return (
                <div
                  key={se.exerciseId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                >
                  <ExerciseCard
                    se={se}
                    setsData={exerciseSets}
                    appearance={appearance}
                    userGymId={gym?.id}
                    showMachineNumbers={gym?.showMachineNumbers ?? false}
                    onContinue={() => handleContinueExercise(se.exerciseId)}
                    onSetsCountChange={(newCount: number) => {
                      const state = useWorkoutStore.getState()
                      const currentSets = state.setsData[se.exerciseId] ?? []
                      if (newCount > currentSets.length) {
                        const newSet: import("@/stores/workout-store").SetLog = {
                          exerciseId: se.exerciseId,
                          exerciseName: se.exercise.name,
                          setNumber: newCount,
                          reps: parseInt(se.reps) || 0,
                          weight: se.weight,
                          restSeconds: se.restSeconds,
                          completed: false,
                        }
                        useWorkoutStore.getState().setSetsData({
                          ...useWorkoutStore.getState().setsData,
                          [se.exerciseId]: [...currentSets, newSet],
                        })
                      } else if (newCount < currentSets.length) {
                        const lastIdx = currentSets.length - 1
                        if (currentSets[lastIdx]?.completed) return
                        useWorkoutStore.getState().setSetsData({
                          ...useWorkoutStore.getState().setsData,
                          [se.exerciseId]: currentSets.slice(0, newCount),
                        })
                      }
                    }}
                    dragHandleProps={{}}
                    onSetComplete={(setIdx) => {
                      if (isResting) skipRest()
                      const updated = [...exerciseSets]
                      updated[setIdx] = { ...updated[setIdx], completed: true }
                      store.setSetsData({ ...store.setsData, [se.exerciseId]: updated })
                    }}
                    onWeightChange={(weight) => {
                      store.updateAllSetWeights(se.exerciseId, weight)
                    }}
                    onSetUpdate={(setIdx, updates) => {
                      store.updateSet(se.exerciseId, setIdx, updates)
                    }}
                    lastPerformance={lastPerformance[se.exerciseId] ?? null}
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
                    appearance="completed"
                    userGymId={gym?.id}
                    showMachineNumbers={gym?.showMachineNumbers ?? false}
                    onSetComplete={(setIdx) => {
                      const sets = [...(store.setsData[se.exerciseId] ?? [])]
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
                  <span
                    key={i}
                    className="text-2xl animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
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
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur">
            <div className="mx-auto flex max-w-2xl gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!window.confirm("¿Descartar este entrenamiento? Se perderán las series."))
                    return
                  store.resetWorkout()
                  router.push(`/rutinas/${planId}`)
                }}
              >
                <X className="mr-1 h-4 w-4" /> Descartar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || isPaused || !hasCompletedSet}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Finalizar entrenamiento"}
              </Button>
            </div>
          </div>
        )}

        {phase === "done" && !showCelebration && (
          <div className="flex gap-3 justify-end pb-20">
            <Button
              variant="outline"
              onClick={() => {
                store.resetWorkout()
                router.push(`/rutinas/${planId}`)
                router.refresh()
              }}
            >
              Ir al inicio
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
