"use client"

import { useEffect, useRef, useCallback } from "react"
import { useWorkoutStore } from "@/stores/workout-store"
import { sounds, startAmbient, stopAmbient } from "@/lib/sounds"
import { useSettingsStore } from "@/stores/settings-store"
import { useSound } from "@/hooks/use-sound"
import { DEFAULT_REST_SECONDS } from "@/constants/workout"
import type { AmbientPhase } from "@/lib/sounds"

interface WorkoutSessionOptions {
  totalExercises: number
  restSeconds?: number
  onComplete?: () => void
}

export function useWorkoutSession({
  totalExercises,
  restSeconds = DEFAULT_REST_SECONDS,
  onComplete,
}: WorkoutSessionOptions) {
  const store = useWorkoutStore()
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const { play } = useSound()

  const elapsedRef = useRef<NodeJS.Timeout | null>(null)
  const restRef = useRef<NodeJS.Timeout | null>(null)
  const ambientRef = useRef<((phase: AmbientPhase) => void) | null>(null)
  const onCompleteRef = useRef(onComplete)
  const initialized = useRef(false)
  const soundEnabledRef = useRef(soundEnabled)
  const restSecondsRef = useRef(restSeconds)
  const totalExercisesRef = useRef(totalExercises)

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])
  useEffect(() => {
    restSecondsRef.current = restSeconds
  }, [restSeconds])
  useEffect(() => {
    totalExercisesRef.current = totalExercises
  }, [totalExercises])
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // ── Timer primitives (defined before effects that use them) ──

  const stopElapsedTimer = useCallback(() => {
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
  }, [])

  const startElapsedTimer = useCallback(() => {
    stopElapsedTimer()
    elapsedRef.current = setInterval(() => {
      useWorkoutStore.getState().incrementElapsed()
    }, 1000)
  }, [stopElapsedTimer])

  const stopRestTimer = useCallback(() => {
    if (restRef.current) {
      clearInterval(restRef.current)
      restRef.current = null
    }
  }, [])

  // ── Init: resume from persisted state ──
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const s = useWorkoutStore.getState()
    if (s.phase !== "prepare" && s.phase !== "done" && s.savedAt) {
      const now = Date.now()
      const delta = (now - s.savedAt) / 1000
      store.setElapsedSeconds(Math.floor(s.elapsedSeconds + delta))

      if (s.isResting && !s.isRestPaused && s.restUpdatedAt) {
        const restDelta = (now - s.restUpdatedAt) / 1000
        const realRest = Math.max(0, Math.floor(s.restRemaining - restDelta))
        if (realRest <= 0) {
          store.setResting(false)
          store.setRestRemaining(0)
        } else {
          store.setRestRemaining(realRest)
        }
      } else if (s.isRestPaused) {
        store.setRestRemaining(s.restPausedRemaining)
        store.setRestUpdatedAt(Date.now())
      }

      startElapsedTimer()
      if (soundEnabledRef.current) {
        ambientRef.current = startAmbient()
        ambientRef.current(s.phase as AmbientPhase)
      }
    }
  }, [store, soundEnabled, startElapsedTimer])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopElapsedTimer()
      stopRestTimer()
      stopAmbient()
    }
  }, [stopElapsedTimer, stopRestTimer])

  const startRest = useCallback(() => {
    stopRestTimer()
    store.setRestRemaining(restSeconds)
    store.setRestTotalDuration(restSeconds)
    store.setResting(true)
    store.setRestPaused(false)

    if (soundEnabledRef.current) play("restStart")

    restRef.current = setInterval(() => {
      const s = useWorkoutStore.getState()
      const next = s.restRemaining - 1

      if (next <= 0) {
        stopRestTimer()
        store.setResting(false)
        store.setRestRemaining(0)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        if (soundEnabledRef.current) play("restEnd")
        return
      }

      store.decrementRest()
      if (next <= 3 && soundEnabledRef.current) sounds.restWarning()
    }, 1000)
  }, [store, play, restSeconds, stopRestTimer])

  const markExerciseComplete = useCallback(
    (exerciseIdx: number) => {
      if (exerciseIdx !== store.currentExerciseIdx) return
      if (soundEnabledRef.current) play("exerciseComplete")
      if (navigator.vibrate) navigator.vibrate(100)

      const isLast = exerciseIdx >= totalExercisesRef.current - 1
      store.advanceExercise()

      if (isLast) {
        if (soundEnabledRef.current && ambientRef.current) {
          const phase = useWorkoutStore.getState().phase
          ambientRef.current(phase as AmbientPhase)
          if (phase === "active" || phase === "cooldown") play("phaseTransition")
        }
        return
      }

      const newPhase = useWorkoutStore.getState().phase
      if (soundEnabledRef.current && ambientRef.current) {
        ambientRef.current(newPhase as AmbientPhase)
        if (newPhase === "active") play("phaseTransition")
      }
      startRest()
    },
    [store, play, startRest]
  )

  const startWorkout = useCallback(() => {
    if (store.phase !== "prepare") return

    store.startWorkout(store.splitId!, totalExercises)
    startElapsedTimer()

    if (soundEnabledRef.current) {
      ambientRef.current = startAmbient()
      ambientRef.current("warmup")
      setTimeout(() => play("workoutStart"), 100)
    }
  }, [store, totalExercises, startElapsedTimer, play])

  const skipRest = useCallback(() => {
    stopRestTimer()
    store.setResting(false)
    store.setRestRemaining(0)
  }, [store, stopRestTimer])

  const pauseRest = useCallback(() => {
    stopRestTimer()
    store.setRestPaused(true)
  }, [store, stopRestTimer])

  const resumeRest = useCallback(() => {
    const sr = store.restPausedRemaining
    store.setRestPaused(false)
    store.setRestRemaining(sr)

    restRef.current = setInterval(() => {
      const s = useWorkoutStore.getState()
      const next = s.restRemaining - 1

      if (next <= 0) {
        stopRestTimer()
        store.setResting(false)
        store.setRestRemaining(0)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        if (soundEnabledRef.current) play("restEnd")
        return
      }

      store.decrementRest()
      if (next <= 3 && soundEnabledRef.current) sounds.restWarning()
    }, 1000)
  }, [store, play, stopRestTimer])

  const finishWorkout = useCallback(() => {
    stopElapsedTimer()
    stopRestTimer()
    store.finishWorkout()
    stopAmbient()
    ambientRef.current = null

    if (soundEnabledRef.current) play("workoutComplete")
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500])

    onCompleteRef.current?.()
  }, [store, play, stopElapsedTimer, stopRestTimer])

  const elapsedFormatted = `${String(Math.floor(store.elapsedSeconds / 60)).padStart(2, "0")}:${String(store.elapsedSeconds % 60).padStart(2, "0")}`

  return {
    phase: store.phase,
    currentExerciseIdx: store.currentExerciseIdx,
    completedExercises: store.completedExerciseIds.length,
    elapsedSeconds: store.elapsedSeconds,
    elapsedFormatted,
    restRemaining: store.restRemaining,
    isResting: store.isResting,
    isRestPaused: store.isRestPaused,
    startWorkout,
    markExerciseComplete,
    finishWorkout,
    skipRest,
    pauseRest,
    resumeRest,
  }
}

export type { AmbientPhase }
