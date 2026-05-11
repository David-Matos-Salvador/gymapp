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