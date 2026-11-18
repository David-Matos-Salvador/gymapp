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

// Límites de una serie registrada. Los usan la pantalla de entrenar y la API para que un
// error de tipeo (0 repeticiones, 99999 kg) no se guarde ni cuente como récord.
export const SET_LIMITS = {
  reps: { min: 1, max: 300 },
  weight: { min: 0, max: 500 },
} as const

// Mientras se escribe se permite 0 (campo vacío); el mínimo se exige al completar la serie.
export function clampSetValue(field: keyof typeof SET_LIMITS, value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(SET_LIMITS[field].max, Math.max(0, value))
}

export function setLimitError(set: { reps: number; weight: number }): string | null {
  const { reps, weight } = SET_LIMITS
  if (!Number.isInteger(set.reps) || set.reps < reps.min || set.reps > reps.max) {
    return `Ingresa entre ${reps.min} y ${reps.max} repeticiones`
  }
  if (!Number.isFinite(set.weight) || set.weight < weight.min || set.weight > weight.max) {
    return `Ingresa un peso entre ${weight.min} y ${weight.max} kg`
  }
  return null
}

// En un ejercicio de peso corporal (burpees, dominadas) el peso es opcional: es el lastre que
// se agrega, no la carga del ejercicio. Por eso se rotula «Lastre» en vez de «kg».
export function weightLabel(equipment: string): string {
  return equipment === "BODYWEIGHT" ? "Lastre" : "kg"
}

export function finishPartialQuestion(names: string[]): string {
  const count =
    names.length === 1 ? "1 ejercicio sin series" : `${names.length} ejercicios sin series`
  return `Vas a finalizar con ${count}: ${names.join(", ")}. ¿Continuar?`
}
