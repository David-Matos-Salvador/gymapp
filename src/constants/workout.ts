export type WorkoutPhase = "prepare" | "warmup" | "active" | "cooldown" | "done"

export const PHASE_LABELS: Record<WorkoutPhase, string> = {
  prepare: "Preparado",
  warmup: "Calentamiento",
  active: "En acción",
  cooldown: "Enfriamiento",
  done: "Completado",
}

export const PHASE_COLORS: Record<
  WorkoutPhase,
  { bg: string; border: string; text: string } | null
> = {
  prepare: null,
  warmup: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
  },
  active: {
    bg: "bg-green-50 dark:bg-green-950",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-400",
  },
  cooldown: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
  },
  done: null,
}

export const DEFAULT_REST_SECONDS = 60
