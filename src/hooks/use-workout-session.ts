"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { sounds, startAmbient, stopAmbient, duckAmbient } from "@/lib/sounds"
import { useSettingsStore } from "@/stores/settings-store"
import { useWorkoutStore } from "@/stores/workout-store"
import type { AmbientPhase } from "@/lib/sounds"
import type { SetLog } from "@/stores/workout-store"

type WorkoutPhase = "prepare" | "warmup" | "active" | "cooldown" | "done"

interface WorkoutSessionOptions {
  totalExercises: number
  restSeconds: number
  onComplete?: () => void
}

export function useWorkoutSession({
  totalExercises,
  restSeconds,
  onComplete,
}: WorkoutSessionOptions) {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const store = useWorkoutStore()

  const [phase, setPhaseState] = useState<WorkoutPhase>(store.phase)
  const [elapsedSeconds, setElapsedState] = useState(store.elapsedSeconds)
  const [restRemaining, setRestRemainingState] = useState(store.restRemaining)
  const [currentExerciseIdx, setCurrentExerciseIdxState] = useState(store.currentExerciseIdx)
  const [completedExercises, setCompletedExercises] = useState(store.completedExerciseIds.length)
  const [isResting, setIsResting] = useState(store.isResting)

  const elapsedRef = useRef<NodeJS.Timeout | null>(null)
  const restRef = useRef<NodeJS.Timeout | null>(null)
  const ambientRef = useRef<((phase: AmbientPhase) => void) | null>(null)
  const soundEnabledRef = useRef(soundEnabled)
  const totalRef = useRef(totalExercises)
  const onCompleteRef = useRef(onComplete)
  const phaseRef = useRef(phase)
  const initialized = useRef(false)
  const cleanedUp = useRef(false)

  const elapsedForCleanupRef = useRef(elapsedSeconds)
  const restForCleanupRef = useRef(restRemaining)
  useEffect(() => { elapsedForCleanupRef.current = elapsedSeconds }, [elapsedSeconds])
  useEffect(() => { restForCleanupRef.current = restRemaining }, [restRemaining])

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
  useEffect(() => { totalRef.current = totalExercises }, [totalExercises])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const s = useWorkoutStore.getState()
    if (s.phase !== "prepare" && s.phase !== "done" && s.savedAt) {
      cleanedUp.current = false
      const now = Date.now()
      const delta = (now - s.savedAt) / 1000
      const realElapsed = Math.floor(s.elapsedSeconds + delta)
      setElapsedState(realElapsed)
      store.setElapsedSeconds(realElapsed)

      if (s.isResting && !s.isRestPaused && s.restUpdatedAt) {
        const restDelta = (now - s.restUpdatedAt) / 1000
        const realRest = Math.max(0, Math.floor(s.restRemaining - restDelta))
        if (realRest <= 0) {
          store.setResting(false)
          setIsResting(false)
          store.setRestRemaining(0)
          store.setRestUpdatedAt(Date.now())
        } else {
          setRestRemainingState(realRest)
          store.setRestRemaining(realRest)
          setIsResting(true)
        }
      } else if (s.isRestPaused) {
        setRestRemainingState(s.restPausedRemaining)
        store.setRestRemaining(s.restPausedRemaining)
        store.setRestUpdatedAt(Date.now())
        setIsResting(true)
      }

      startElapsedTimer()
      if (soundEnabledRef.current) {
        ambientRef.current = startAmbient()
        ambientRef.current(s.phase as AmbientPhase)
      }
    }

    return () => {
      store.setElapsedSeconds(elapsedRef.current ? elapsedSeconds : store.elapsedSeconds)
    }
  }, [])

  const playSound = useCallback((key: keyof typeof sounds) => {
    if (!soundEnabledRef.current) return
    duckAmbient()
    sounds[key]()
  }, [])

  const stopElapsedTimer = useCallback(() => {
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
  }, [])

  const stopRestTimer = useCallback(() => {
    if (restRef.current) { clearInterval(restRef.current); restRef.current = null }
  }, [])

  const startElapsedTimer = useCallback(() => {
    stopElapsedTimer()
    elapsedRef.current = setInterval(() => {
      setElapsedState((prev) => {
        const next = prev + 1
        queueMicrotask(() => useWorkoutStore.getState().setElapsedSeconds(next))
        return next
      })
    }, 1000)
  }, [stopElapsedTimer])

  const startWorkout = useCallback(() => {
    if (phaseRef.current !== "prepare") return

    const s = useWorkoutStore.getState()
    s.startWorkout(s.splitId!, totalExercises)
    setPhaseState("warmup")
    s.setPhase("warmup")
    setElapsedState(0)
    setCurrentExerciseIdxState(0)
    setCompletedExercises(0)
    cleanedUp.current = false

    startElapsedTimer()

    if (soundEnabledRef.current) {
      ambientRef.current = startAmbient()
      ambientRef.current("warmup")
      setTimeout(() => playSound("workoutStart"), 100)
    }
  }, [playSound, startElapsedTimer, totalExercises])

  const startRest = useCallback(() => {
    stopRestTimer()
    const s = useWorkoutStore.getState()
    setRestRemainingState(restSeconds)
    s.setRestRemaining(restSeconds)
    s.setRestTotalDuration(restSeconds)
    s.setResting(true)
    s.setRestPaused(false)
    s.setRestUpdatedAt(Date.now())
    setIsResting(true)

    if (soundEnabledRef.current) {
      playSound("restStart")
    }

    restRef.current = setInterval(() => {
      setRestRemainingState((prev) => {
        const next = prev - 1
        queueMicrotask(() => useWorkoutStore.getState().setRestRemaining(next))
        if (next <= 0) {
          stopRestTimer()
          setIsResting(false)
          const st = useWorkoutStore.getState()
          st.setResting(false)
          st.setRestRemaining(0)
          st.setRestUpdatedAt(Date.now())
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
          }
          setTimeout(() => {
            if (soundEnabledRef.current) {
              playSound("restEnd")
            }
          }, 0)
          return 0
        }
        if (next <= 3 && next > 0 && soundEnabledRef.current) {
          sounds.restWarning()
        }
        return next
      })
    }, 1000)
  }, [restSeconds, playSound, stopRestTimer])

  const skipRest = useCallback(() => {
    stopRestTimer()
    setRestRemainingState(0)
    const s = useWorkoutStore.getState()
    s.setRestRemaining(0)
    s.setResting(false)
    s.setRestUpdatedAt(Date.now())
    setIsResting(false)
    playSound("click")
  }, [stopRestTimer, playSound])

  const pauseRest = useCallback(() => {
    if (!isResting) return
    stopRestTimer()
    const s = useWorkoutStore.getState()
    s.setRestPaused(true)
    s.setRestPausedRemaining(restRemaining)
    s.setRestUpdatedAt(Date.now())
  }, [isResting, restRemaining, stopRestTimer])

  const resumeRest = useCallback(() => {
    const s = useWorkoutStore.getState()
    const sr = s.restPausedRemaining
    s.setRestPaused(false)
    s.setRestRemaining(sr)
    s.setRestUpdatedAt(Date.now())
    setRestRemainingState(sr)
    setIsResting(true)

    restRef.current = setInterval(() => {
      setRestRemainingState((prev) => {
        const next = prev - 1
        queueMicrotask(() => useWorkoutStore.getState().setRestRemaining(next))
        if (next <= 0) {
          stopRestTimer()
          setIsResting(false)
          const st = useWorkoutStore.getState()
          st.setResting(false)
          st.setRestRemaining(0)
          st.setRestUpdatedAt(Date.now())
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
          }
          setTimeout(() => {
            if (soundEnabledRef.current) {
              playSound("restEnd")
            }
          }, 0)
          return 0
        }
        if (next <= 3 && next > 0 && soundEnabledRef.current) {
          sounds.restWarning()
        }
        return next
      })
    }, 1000)
  }, [stopRestTimer, playSound])

  const markExerciseComplete = useCallback((exerciseIdx: number) => {
    if (exerciseIdx !== currentExerciseIdx) return

    const newCompleted = completedExercises + 1
    setCompletedExercises(newCompleted)

    if (soundEnabledRef.current) {
      playSound("exerciseComplete")
    }

    if (navigator.vibrate) {
      navigator.vibrate(100)
    }

    const isLast = exerciseIdx >= totalRef.current - 1
    const s = useWorkoutStore.getState()

    if (isLast) {
      if (phaseRef.current === "warmup" && newCompleted >= Math.ceil(totalRef.current * 0.3)) {
        setPhaseState("active")
        s.setPhase("active")
        if (ambientRef.current) ambientRef.current("active")
      } else {
        setPhaseState("cooldown")
        s.setPhase("cooldown")
        if (ambientRef.current) ambientRef.current("cooldown")
        playSound("phaseTransition")
      }
      return
    }

    if (phaseRef.current === "warmup" && newCompleted >= Math.ceil(totalRef.current * 0.3)) {
      setPhaseState("active")
      s.setPhase("active")
      if (ambientRef.current) ambientRef.current("active")
      playSound("phaseTransition")
    }

    const nextIdx = exerciseIdx + 1
    setCurrentExerciseIdxState(nextIdx)
    s.setCurrentExerciseIdx(nextIdx)
    startRest()
  }, [currentExerciseIdx, completedExercises, playSound, startRest])

  const finishWorkout = useCallback(() => {
    stopElapsedTimer()
    stopRestTimer()

    if (soundEnabledRef.current) {
      playSound("workoutComplete")
    }

    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 500])
    }

    stopAmbient()
    ambientRef.current = null

    setPhaseState("done")
    const s = useWorkoutStore.getState()
    s.setPhase("done")
    s.setResting(false)
    setIsResting(false)
    onCompleteRef.current?.()
  }, [playSound, stopElapsedTimer, stopRestTimer])

  const cleanup = useCallback(() => {
    if (cleanedUp.current) return
    cleanedUp.current = true
    stopElapsedTimer()
    stopRestTimer()
    stopAmbient()
    ambientRef.current = null
    const s = useWorkoutStore.getState()
    s.setElapsedSeconds(elapsedForCleanupRef.current)
    s.setRestRemaining(restForCleanupRef.current)
    s.setRestUpdatedAt(Date.now())
  }, [stopElapsedTimer, stopRestTimer])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const elapsedFormatted = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`
  const restFormatted = `${String(Math.floor(restRemaining / 60)).padStart(2, "0")}:${String(restRemaining % 60).padStart(2, "0")}`

  return {
    phase,
    currentExerciseIdx,
    completedExercises,
    totalExercises,
    elapsedSeconds,
    elapsedFormatted,
    restRemaining,
    restFormatted,
    isResting,
    isRestPaused: store.isRestPaused,
    startWorkout,
    markExerciseComplete,
    finishWorkout,
    playSound,
    skipRest,
    pauseRest,
    resumeRest,
    cleanup,
  }
}
