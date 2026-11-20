"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useWorkoutSession } from "@/hooks/use-workout-session"
import { useWorkoutStore, type SetLog } from "@/stores/workout-store"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CelebrationOverlay } from "@/components/workout/celebration-overlay"
import { ExerciseCard } from "@/components/workout/exercise-card"
import { RestTimer } from "@/components/workout/rest-timer"
import { WorkoutTopBar } from "@/components/workout/workout-top-bar"
import {
  PHASE_LABELS,
  PHASE_COLORS,
  finishPartialQuestion,
  setLimitError,
} from "@/constants/workout"
import { Save, Play, Trophy, ChevronDown, Pause, X, Flame, Zap } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MUSCLE_LABELS } from "@/constants/user"
import type { SplitExercise, SplitData } from "@/types/exercise"

interface WorkoutClientProps {
  planId: string
  split: SplitData
  gym: { id: string; showMachineNumbers: boolean } | null
  lastPerformance: Record<string, Array<{ weight: number; reps: number }>>
}

export function WorkoutClient({ planId, split, gym, lastPerformance }: WorkoutClientProps) {
  const router = useRouter()
  const splitId = split.id
  const store = useWorkoutStore()
  // El servidor no conoce lo guardado en este dispositivo (un entrenamiento a medias): hasta
  // revisarlo, ya en el navegador, la pantalla se dibuja como recién abierta.
  const [ready, setReady] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState({
    weeklyCompleted: 0,
    weeklyTarget: 0,
    weeklyStreak: 0,
    bestStreak: 0,
  })
  const [exerciseOrder, setExerciseOrder] = useState<string[]>(() =>
    split.exercises.map((e) => e.exerciseId)
  )
  const dragIdx = useRef<number | null>(null)
  const finishTriggered = useRef(false)

  const storeCurrentExerciseIdx = useWorkoutStore((s) => s.currentExerciseIdx)

  const currentRestSeconds = useMemo(() => {
    if (split.exercises.length === 0) return undefined
    return split.exercises[Math.min(storeCurrentExerciseIdx, split.exercises.length - 1)]
      ?.restSeconds
  }, [split, storeCurrentExerciseIdx])

  const {
    phase: storedPhase,
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
    startRest,
    skipRest,
    pauseRest,
    resumeRest,
  } = useWorkoutSession({
    totalExercises: split.exercises.length,
    restSeconds: currentRestSeconds,
    onComplete: () => {
      fetchCelebrationData()
      setShowCelebration(true)
    },
  })

  const phase = ready ? storedPhase : "prepare"

  const preparedSplitId = useRef<string | null>(null)
  useEffect(() => {
    if (preparedSplitId.current === split.id) return
    preparedSplitId.current = split.id

    const snapshot = useWorkoutStore.getState()
    const exerciseIdSet = new Set(split.exercises.map((e) => e.exerciseId))
    const completedMatch = snapshot.completedExerciseIds.every((id) => exerciseIdSet.has(id))
    const validResume =
      snapshot.phase !== "prepare" &&
      snapshot.phase !== "done" &&
      snapshot.splitId === split.id &&
      snapshot.totalExercises === split.exercises.length &&
      snapshot.currentExerciseIdx < split.exercises.length &&
      completedMatch

    if (!validResume) {
      useWorkoutStore.getState().resetWorkout()

      const initialSets: Record<string, SetLog[]> = {}
      split.exercises.forEach((se) => {
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
      useWorkoutStore.getState().setSplitId(split.id)
      useWorkoutStore.getState().setTotalExercises(split.exercises.length)
      useWorkoutStore.getState().setSetsData(initialSets)
    }
    setReady(true)
  }, [split])

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

  const wasResting = useRef(false)
  useEffect(() => {
    if (wasResting.current && !isResting) setAnnouncement("Descanso terminado")
    wasResting.current = isResting
  }, [isResting])

  const handleSubmit = useCallback(
    async (confirmPartial = false) => {
      if (saving) return
      const allSets = Object.values(store.setsData)
        .flat()
        .filter((s) => s.completed)
      if (allSets.length === 0) {
        toast.error("Completa al menos una serie")
        return
      }
      const outOfRange = allSets.find((s) => setLimitError(s))
      if (outOfRange) {
        toast.error(
          `${outOfRange.exerciseName}, serie ${outOfRange.setNumber}: ${setLimitError(outOfRange)}`
        )
        return
      }

      const incomplete = split.exercises.filter(
        (exercise) => !store.setsData[exercise.exerciseId]?.some((set) => set.completed)
      )
      if (confirmPartial && incomplete.length > 0) {
        const names = incomplete.map((exercise) => exercise.exercise.name)
        if (!window.confirm(finishPartialQuestion(names))) {
          return
        }
      }

      setSaving(true)
      setSaveError(null)
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
        const message = err.error || "Error al guardar"
        setSaveError(message)
        toast.error(message)
        setSaving(false)
      }
    },
    [store, splitId, elapsedSeconds, notes, finishWorkout, saving, split]
  )

  useEffect(() => {
    if (phase === "done" || phase === "prepare") return
    if (finishTriggered.current) return
    if (completedExercises >= split.exercises.length) {
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

  const handleSkipExercise = useCallback(async () => {
    const currentId = activeExercises[0]?.exerciseId
    const entry = currentId ? exerciseMap.get(currentId) : undefined
    if (!entry || !currentId) return
    store.addSkippedExercise(currentId)
    store.addCompletedExercise(currentId)
    setAnnouncement(`${entry.se.exercise.name} omitido`)
    markExerciseComplete(entry.origIdx)
  }, [activeExercises, exerciseMap, markExerciseComplete, store])

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
  const totalExercises = split.exercises.length
  const setsData = store.setsData
  const hasCompletedSet = Object.values(setsData).some((sets) => sets.some((set) => set.completed))

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
          router.push(`/my-routine/${planId}`)
          router.refresh()
        }}
      />

      {!showCelebration && (
        <WorkoutTopBar
          splitName={split.name}
          isActive={isActive}
          elapsedFormatted={elapsedFormatted}
          completedExercises={completedExercises}
          totalExercises={totalExercises}
          hasUnsavedSets={isActive && hasCompletedSet}
          onExit={() => {
            pauseWorkout()
            router.push(`/my-routine/${planId}`)
          }}
        />
      )}

      <div
        className={cn(
          "container mx-auto max-w-2xl space-y-5 px-4 py-4 pb-28 md:py-8",
          showCelebration && "hidden"
        )}
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>

        <div>
          <h1 className="sr-only">{split.name}</h1>
          <div className="flex items-center justify-end flex-wrap gap-2">
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
                  El cronómetro está detenido. Reanuda cuando estés listo.
                </p>
              </div>
              <Button size="sm" className="min-h-11" onClick={resumeWorkout}>
                <Play className="mr-1 h-3.5 w-3.5" /> Reanudar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (!window.confirm("¿Descartar este entrenamiento? Se perderán las series."))
                    return
                  store.resetWorkout()
                  router.push(`/my-routine/${planId}`)
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
              {totalExercises === 1 ? "1 ejercicio" : `${totalExercises} ejercicios`}
              {split.estimatedDuration ? ` · unos ${split.estimatedDuration} min` : ""}
            </p>
            {/* Vista previa del día (#199): antes solo decía cuántos ejercicios venían. */}
            <ol aria-label="Ejercicios de hoy" className="w-full divide-y divide-border/60">
              {split.exercises.map((se, idx) => (
                <li key={se.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-yellow/15 text-xs font-semibold tabular-nums text-accent-yellow">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{se.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {MUSCLE_LABELS[se.exercise.muscleGroup] ?? se.exercise.muscleGroup}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {se.sets} × {se.reps}
                  </span>
                </li>
              ))}
            </ol>
            <Button onClick={startWorkout} disabled={!ready} className="min-h-11 gap-2">
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
                        const newSet: SetLog = {
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
                      setAnnouncement(`Serie ${setIdx + 1} completada`)
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
                    onStartRest={(seconds) => {
                      setAnnouncement(`Descanso de ${seconds} segundos`)
                      startRest(seconds)
                    }}
                    lastPerformance={lastPerformance[se.exerciseId] ?? null}
                    onSkip={handleSkipExercise}
                    skipped={store.skippedExerciseIds.includes(se.exerciseId)}
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
              <div className="flex justify-center gap-2 py-2 text-accent-yellow">
                <Trophy className="h-7 w-7" />
                <Flame className="h-7 w-7" />
                <Zap className="h-7 w-7" />
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
              <p className="mt-2 text-[11px] text-muted-foreground">
                Borrador guardado en este dispositivo. Si cambias de dispositivo, no se sincroniza.
              </p>
            </CardContent>
          </Card>
        )}

        {isActive && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur">
            {saveError && (
              <div className="mx-auto mb-2 flex max-w-2xl items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <span>No se pudo guardar.</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 border-destructive/30 text-destructive"
                  onClick={() => void handleSubmit(true)}
                  disabled={saving}
                >
                  Reintentar
                </Button>
              </div>
            )}
            <div className="mx-auto flex max-w-2xl gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => {
                  if (!window.confirm("¿Descartar este entrenamiento? Se perderán las series."))
                    return
                  store.resetWorkout()
                  router.push(`/my-routine/${planId}`)
                }}
              >
                <X className="mr-1 h-4 w-4" /> Descartar
              </Button>
              <Button
                onClick={() => void handleSubmit(true)}
                disabled={saving || isPaused || !hasCompletedSet}
                className="min-h-11 flex-1 gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {!hasCompletedSet
                  ? "Completa una serie"
                  : saving
                    ? "Guardando..."
                    : "Finalizar entrenamiento"}
              </Button>
            </div>
          </div>
        )}

        {phase === "done" && !showCelebration && (
          <div className="flex gap-3 justify-end pb-20">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                store.resetWorkout()
                router.push(`/my-routine/${planId}`)
                router.refresh()
              }}
            >
              Volver a mi rutina
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
