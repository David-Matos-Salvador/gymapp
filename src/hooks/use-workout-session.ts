"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { sounds, startAmbient, stopAmbient, duckAmbient } from "@/lib/sounds"
import { useSettingsStore } from "@/stores/settings-store"
import type { AmbientPhase } from "@/lib/sounds"

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
  const [phase, setPhase] = useState<WorkoutPhase>("prepare")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restRemaining, setRestRemaining] = useState(0)
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [completedExercises, setCompletedExercises] = useState(0)

  const elapsedRef = useRef<NodeJS.Timeout | null>(null)
  const restRef = useRef<NodeJS.Timeout | null>(null)
  const ambientRef = useRef<((phase: AmbientPhase) => void) | null>(null)
  const phaseRef = useRef<WorkoutPhase>(phase)
  const completedRef = useRef(completedExercises)
  const soundEnabledRef = useRef(soundEnabled)
  const totalRef = useRef(totalExercises)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { completedRef.current = completedExercises }, [completedExercises])
  useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
  useEffect(() => { totalRef.current = totalExercises }, [totalExercises])

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
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
  }, [stopElapsedTimer])

  const startWorkout = useCallback(() => {
    if (phaseRef.current !== "prepare") return

    setPhase("warmup")
    setElapsedSeconds(0)
    setCurrentExerciseIdx(0)
    setCompletedExercises(0)
    startElapsedTimer()

    if (soundEnabledRef.current) {
      ambientRef.current = startAmbient()
      ambientRef.current("warmup")
      setTimeout(() => playSound("workoutStart"), 100)
    }
  }, [playSound, startElapsedTimer])

  const advanceToActive = useCallback(() => {
    if (phaseRef.current !== "warmup") return
    setPhase("active")
    if (soundEnabledRef.current && ambientRef.current) {
      ambientRef.current("active")
      playSound("phaseTransition")
    }
  }, [playSound])

  const startRest = useCallback(() => {
    stopRestTimer()
    setRestRemaining(restSeconds)

    if (soundEnabledRef.current) {
      playSound("restStart")
    }

    restRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          stopRestTimer()
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
    setRestRemaining(0)
    playSound("click")
  }, [stopRestTimer, playSound])

  const markExerciseComplete = useCallback((exerciseIdx: number) => {
    if (exerciseIdx !== currentExerciseIdx) return

    const newCompleted = completedRef.current + 1
    setCompletedExercises(newCompleted)

    if (soundEnabledRef.current) {
      playSound("exerciseComplete")
    }

    const isLast = exerciseIdx >= totalRef.current - 1

    if (isLast) {
      if (phaseRef.current === "warmup" && newCompleted >= Math.ceil(totalRef.current * 0.3)) {
        setPhase("active")
        if (ambientRef.current) ambientRef.current("active")
      } else {
        setPhase("cooldown")
        if (ambientRef.current) ambientRef.current("cooldown")
        playSound("phaseTransition")
      }
      return
    }

    // Si estábamos en warmup y ya completamos ~30%, transicionar a active
    if (phaseRef.current === "warmup" && newCompleted >= Math.ceil(totalRef.current * 0.3)) {
      setPhase("active")
      if (ambientRef.current) ambientRef.current("active")
      playSound("phaseTransition")
    }

    const nextIdx = exerciseIdx + 1
    setCurrentExerciseIdx(nextIdx)
    startRest()
  }, [currentExerciseIdx, playSound, startRest])

  const finishWorkout = useCallback(() => {
    stopElapsedTimer()
    stopRestTimer()

    if (soundEnabledRef.current) {
      playSound("workoutComplete")
    }

    stopAmbient()
    ambientRef.current = null

    setPhase("done")
    onComplete?.()
  }, [playSound, onComplete, stopElapsedTimer, stopRestTimer])

  const cleanup = useCallback(() => {
    stopElapsedTimer()
    stopRestTimer()
    stopAmbient()
    ambientRef.current = null
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
    isResting: restRemaining > 0,
    startWorkout,
    advanceToActive,
    markExerciseComplete,
    finishWorkout,
    playSound,
    skipRest,
    cleanup,
  }
}
