/*
 * Frontend DTOs for workout/exercise UI components.
 * These intentionally mirror Prisma models but are decoupled:
 * - Exercise → subset of Prisma Exercise (no description, videoUrl, animationData)
 * - SplitExercise → subset of RoutineSplitExercise (no notes, uses nested Exercise)
 * - SetLog → maps to WorkoutSetLog fields consumed on the client
 * - SplitData / SplitPlan → used for workout session page data fetching
 *
 * Used by:
 *   src/app/rutinas/[planId]/entrenar/[splitId]/page.tsx
 *   src/components/workout/exercise-card.tsx
 *   src/components/workout/exercise-detail-sheet.tsx
 */
export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  imageUrl?: string | null
}

export interface SplitExercise {
  id: string
  exerciseId: string
  sets: number
  reps: string
  weight: number
  restSeconds: number
  order: number
  exercise: Exercise
}

export interface SetLog {
  exerciseId: string
  exerciseName: string
  setNumber: number
  reps: number
  weight: number
  restSeconds: number
  completed: boolean
}

export interface SplitPlan {
  id: string
  name: string
}

export interface SplitData {
  id: string
  name: string
  description: string | null
  exercises: SplitExercise[]
  plan: SplitPlan | null
}