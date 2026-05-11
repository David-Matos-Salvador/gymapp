"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type WorkoutPhase = "prepare" | "warmup" | "active" | "cooldown" | "done"

export interface SetLog {
  exerciseId: string
  exerciseName: string
  setNumber: number
  reps: number
  weight: number
  completed: boolean
}

interface WorkoutStore {
  splitId: string | null
  phase: WorkoutPhase
  totalExercises: number
  elapsedSeconds: number
  savedAt: number | null
  currentExerciseIdx: number
  completedExerciseIds: string[]
  setsData: Record<string, SetLog[]>
  notes: string

  isResting: boolean
  restRemaining: number
  restTotalDuration: number
  restPausedRemaining: number
  isRestPaused: boolean
  restUpdatedAt: number | null

  setSplitId: (id: string) => void
  setTotalExercises: (n: number) => void
  setPhase: (phase: WorkoutPhase) => void
  setElapsedSeconds: (s: number) => void
  setCurrentExerciseIdx: (idx: number) => void
  addCompletedExercise: (id: string) => void
  setCompletedExerciseIds: (ids: string[]) => void
  setSetsData: (data: Record<string, SetLog[]>) => void
  updateSet: (exerciseId: string, setIdx: number, updates: Partial<SetLog>) => void
  updateAllSetWeights: (exerciseId: string, weight: number) => void
  setNotes: (notes: string) => void

  setResting: (resting: boolean) => void
  setRestRemaining: (s: number) => void
  setRestTotalDuration: (s: number) => void
  setRestPaused: (paused: boolean) => void
  setRestPausedRemaining: (s: number) => void
  setRestUpdatedAt: (ts: number) => void

  startWorkout: (splitId: string, totalExercises: number) => void
  resetWorkout: () => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      splitId: null,
      phase: "prepare",
      totalExercises: 0,
      elapsedSeconds: 0,
      savedAt: null,
      currentExerciseIdx: 0,
      completedExerciseIds: [],
      setsData: {},
      notes: "",

      isResting: false,
      restRemaining: 0,
      restTotalDuration: 60,
      restPausedRemaining: 0,
      isRestPaused: false,
      restUpdatedAt: null,

      setSplitId: (id) => set({ splitId: id }),
      setTotalExercises: (n) => set({ totalExercises: n }),
      setPhase: (phase) => set({ phase }),
      setElapsedSeconds: (s) => set({ elapsedSeconds: s, savedAt: Date.now() }),
      setCurrentExerciseIdx: (idx) => set({ currentExerciseIdx: idx }),
      addCompletedExercise: (id) =>
        set((s) => ({
          completedExerciseIds: s.completedExerciseIds.includes(id)
            ? s.completedExerciseIds
            : [...s.completedExerciseIds, id],
        })),
      setCompletedExerciseIds: (ids) => set({ completedExerciseIds: ids }),
      setSetsData: (data) => set({ setsData: data }),
      updateSet: (exerciseId, setIdx, updates) =>
        set((s) => ({
          setsData: {
            ...s.setsData,
            [exerciseId]: (s.setsData[exerciseId] ?? []).map((set, i) =>
              i === setIdx ? { ...set, ...updates } : set
            ),
          },
        })),
      updateAllSetWeights: (exerciseId, weight) =>
        set((s) => ({
          setsData: {
            ...s.setsData,
            [exerciseId]: (s.setsData[exerciseId] ?? []).map((set) => ({
              ...set,
              weight,
            })),
          },
        })),
      setNotes: (notes) => set({ notes }),

      setResting: (isResting) => set({ isResting }),
      setRestRemaining: (s) => set({ restRemaining: s, restUpdatedAt: Date.now() }),
      setRestTotalDuration: (s) => set({ restTotalDuration: s }),
      setRestPaused: (paused) => {
        set((s) => ({
          isRestPaused: paused,
          restPausedRemaining: paused ? s.restRemaining : s.restRemaining,
          restUpdatedAt: paused ? Date.now() : null,
        }))
      },
      setRestPausedRemaining: (s) => set({ restPausedRemaining: s }),
      setRestUpdatedAt: (ts) => set({ restUpdatedAt: ts }),

      startWorkout: (splitId, totalExercises) =>
        set((s) => ({
          splitId,
          totalExercises,
          phase: "warmup",
          elapsedSeconds: 0,
          savedAt: Date.now(),
          currentExerciseIdx: 0,
          completedExerciseIds: [],
          setsData: Object.keys(s.setsData).length > 0 ? s.setsData : {},
          notes: "",
          isResting: false,
          restRemaining: 0,
          restUpdatedAt: null,
        })),

      resetWorkout: () =>
        set({
          splitId: null,
          phase: "prepare",
          totalExercises: 0,
          elapsedSeconds: 0,
          savedAt: null,
          currentExerciseIdx: 0,
          completedExerciseIds: [],
          setsData: {},
          notes: "",
          isResting: false,
          restRemaining: 0,
          restUpdatedAt: null,
        }),
    }),
    { name: "gym-workout-session" }
  )
)
