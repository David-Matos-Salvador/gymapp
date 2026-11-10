/*
 * Frontend DTOs for workout/exercise UI components.
 * These intentionally mirror Prisma models but are decoupled:
 * - Exercise → subset of Prisma Exercise (no animationData)
 * - SplitExercise → subset of RoutineSplitExercise (no notes, uses nested Exercise)
 * - SetLog → maps to WorkoutSetLog fields consumed on the client
 * - SplitData / SplitPlan → used for workout session page data fetching
 *
 * Used by:
 *   src/app/my-routine/[planId]/workout/[splitId]/page.tsx
 *   src/components/workout/exercise-card.tsx
 *   src/components/workout/exercise-detail-sheet.tsx
 */
export interface GymEquipmentRef {
  id: string
  name: string
  machineNumber: number | null
  location: string | null
  gymId: string
  imageUrl: string | null
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  imageUrl?: string | null
  videoUrl?: string | null
  description?: string | null
  gymEquipments?: GymEquipmentRef[]
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
  estimatedDuration: number | null
  exercises: SplitExercise[]
  plan: SplitPlan | null
}
