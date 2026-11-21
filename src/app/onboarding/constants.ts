import { Flame, Dumbbell, Heart, HelpCircle, Star, Trophy, Activity, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type Objective = "WEIGHT_LOSS" | "MUSCLE_GAIN" | "GENERAL_FITNESS" | "UNSURE"
export type TrainingHistory = "NONE" | "ONCE" | "TWO_TO_THREE" | "FOUR_PLUS"
export type ExperienceLevelStep = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ELITE"
export type UsualSchedule =
  | "BEFORE_8AM"
  | "8AM_11AM"
  | "11AM_2PM"
  | "2PM_5PM"
  | "5PM_7PM"
  | "7PM_9PM"
  | "AFTER_9PM"

export interface MeasurementsInput {
  bodyFat: number | null
  muscleMass: number | null
  neck: number | null
  shoulders: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  leftArm: number | null
  rightArm: number | null
  leftForearm: number | null
  rightForearm: number | null
  leftThigh: number | null
  rightThigh: number | null
  leftCalf: number | null
  rightCalf: number | null
  notes: string
}

export const emptyMeasurements: MeasurementsInput = {
  bodyFat: null,
  muscleMass: null,
  neck: null,
  shoulders: null,
  chest: null,
  waist: null,
  hips: null,
  leftArm: null,
  rightArm: null,
  leftForearm: null,
  rightForearm: null,
  leftThigh: null,
  rightThigh: null,
  leftCalf: null,
  rightCalf: null,
  notes: "",
}

export const measurementFields: {
  key: Exclude<keyof MeasurementsInput, "notes">
  label: string
  unit: string
  placeholder: string
}[] = [
  { key: "bodyFat", label: "Grasa corporal", unit: "%", placeholder: "Ej: 18" },
  { key: "muscleMass", label: "Masa muscular", unit: "kg", placeholder: "Ej: 35" },
  { key: "neck", label: "Cuello", unit: "cm", placeholder: "Ej: 38" },
  { key: "shoulders", label: "Hombros", unit: "cm", placeholder: "Ej: 115" },
  { key: "chest", label: "Pecho", unit: "cm", placeholder: "Ej: 100" },
  { key: "waist", label: "Cintura", unit: "cm", placeholder: "Ej: 80" },
  { key: "hips", label: "Cadera", unit: "cm", placeholder: "Ej: 95" },
  { key: "leftArm", label: "Brazo izq.", unit: "cm", placeholder: "Ej: 34" },
  { key: "rightArm", label: "Brazo der.", unit: "cm", placeholder: "Ej: 35" },
  { key: "leftForearm", label: "Antebrazo izq.", unit: "cm", placeholder: "Ej: 28" },
  { key: "rightForearm", label: "Antebrazo der.", unit: "cm", placeholder: "Ej: 29" },
  { key: "leftThigh", label: "Muslo izq.", unit: "cm", placeholder: "Ej: 58" },
  { key: "rightThigh", label: "Muslo der.", unit: "cm", placeholder: "Ej: 59" },
  { key: "leftCalf", label: "Pantorrilla izq.", unit: "cm", placeholder: "Ej: 37" },
  { key: "rightCalf", label: "Pantorrilla der.", unit: "cm", placeholder: "Ej: 38" },
]

export interface OnboardingData {
  objective: Objective | null
  trainingHistory: TrainingHistory | null
  experienceLevel: ExperienceLevelStep | null
  trainingFrequency: number | null
  physicalConditions: string[]
  /** «¿Cuál?» de la condición marcada (opcional; lo ven solo el miembro y su coach). */
  conditionDetail: string
  weight: number | null
  height: number | null
  usualSchedule: UsualSchedule | null
  measurements: MeasurementsInput
}

export interface GeneratedPlanData {
  id: string
  name: string
  description: string | null
  focus: string | null
  difficulty: string
  frequency: number
  objective: string
  splits: {
    id: string
    label: string
    name: string
    muscleGroups: string[]
    estimatedDuration: number | null
    exercises: {
      id: string
      name: string
      muscleGroup: string
      equipment: string
      sets: number
      reps: string
      weight: number
      restSeconds: number
    }[]
  }[]
}

export const TOTAL_STEPS = 11

export const STEPS = [
  { num: 1, title: "Tu gimnasio" },
  { num: 2, title: "Objetivo" },
  { num: 3, title: "Historial" },
  { num: 4, title: "Experiencia" },
  { num: 5, title: "Frecuencia" },
  { num: 6, title: "Condiciones" },
  { num: 7, title: "Peso y altura" },
  { num: 8, title: "Medidas" },
  { num: 9, title: "Horario" },
  { num: 10, title: "Confirmación" },
  { num: 11, title: "Tu rutina" },
]

export type StepBehavior = "auto-advance" | "manual" | "custom-button" | "system-auto" | "final"

export const STEP_BEHAVIOR: Record<number, StepBehavior> = {
  1: "manual",
  2: "auto-advance",
  3: "auto-advance",
  4: "auto-advance",
  5: "auto-advance",
  6: "manual",
  7: "manual",
  8: "manual",
  9: "auto-advance",
  10: "custom-button",
  11: "custom-button",
}

export const objectiveOptions: {
  value: Objective
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: "WEIGHT_LOSS",
    label: "Perder peso",
    description: "Quemar grasa y definir",
    icon: Flame,
  },
  {
    value: "MUSCLE_GAIN",
    label: "Ganar masa muscular",
    description: "Fuerza e hipertrofia",
    icon: Dumbbell,
  },
  {
    value: "GENERAL_FITNESS",
    label: "Mejorar forma física",
    description: "Salud y bienestar general",
    icon: Heart,
  },
  {
    value: "UNSURE",
    label: "Necesito ayuda",
    description: "Aún no sé cuál elegir",
    icon: HelpCircle,
  },
]

export const trainingHistoryOptions = [
  { value: "NONE", label: "No he entrenado antes", description: "Empiezo desde cero" },
  { value: "ONCE", label: "1 vez por semana", description: "Entrenamiento ocasional" },
  { value: "TWO_TO_THREE", label: "2 a 3 veces por semana", description: "Entrenamiento regular" },
  { value: "FOUR_PLUS", label: "4 o más veces por semana", description: "Entrenamiento frecuente" },
]

export const experienceOptions = [
  {
    value: "BEGINNER",
    label: "Principiante",
    icon: HelpCircle,
    description: "Sé poco de técnica",
  },
  { value: "INTERMEDIATE", label: "Intermedio", icon: Dumbbell, description: "Conozco lo básico" },
  {
    value: "ADVANCED",
    label: "Avanzado",
    icon: Star,
    description: "Buen dominio de técnica y rutinas",
  },
  { value: "ELITE", label: "Élite", icon: Trophy, description: "Entreno de forma autónoma" },
]

export const trainingFrequencyOptions = [
  {
    value: 3,
    label: "3 días por semana",
    description: "Ideal para principiantes — volumen equilibrado",
  },
  { value: 4, label: "4 días por semana", description: "Balance entre entrenar y descansar" },
  { value: 5, label: "5 días por semana", description: "Para quien ya tiene base" },
]

export const physicalConditionOptions = [
  "Discapacidad",
  "Lesión",
  "Enfermedad",
  "Embarazo",
  "Otras",
  "No poseo",
]

// «No poseo» es el valor que se guarda (lo leen la IA y los datos ya guardados); en pantalla se
// muestra «Ninguna», que es como lo diría la persona.
export function physicalConditionLabel(condition: string): string {
  return condition === "No poseo" ? "Ninguna" : condition
}

export const scheduleOptions = [
  { value: "BEFORE_8AM", label: "Madrugada", time: "5 a. m. – 8 a. m.", icon: "🌄" },
  { value: "8AM_11AM", label: "Mañana", time: "8 a. m. – 11 a. m.", icon: "🌤️" },
  { value: "11AM_2PM", label: "Mediodía", time: "11 a. m. – 2 p. m.", icon: "☀️" },
  { value: "2PM_5PM", label: "Tarde", time: "2 p. m. – 5 p. m.", icon: "⛅" },
  { value: "5PM_7PM", label: "Atardecer", time: "5 p. m. – 7 p. m.", icon: "🌇" },
  { value: "7PM_9PM", label: "Noche", time: "7 p. m. – 9 p. m.", icon: "🌙" },
  { value: "AFTER_9PM", label: "Trasnoche", time: "Desde las 9 p. m.", icon: "🌑" },
]

export const loadingMessages = [
  { icon: Activity, text: "Analizando tu perfil...", duration: 1500 },
  { icon: Dumbbell, text: "Generando rutina personalizada...", duration: 1800 },
  { icon: Sparkles, text: "Preparando tu experiencia...", duration: 1200 },
]

export const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
    scale: 0.97,
  }),
}

export const objectiveLabelMap: Record<string, string> = {
  WEIGHT_LOSS: "Perder peso",
  MUSCLE_GAIN: "Ganar masa muscular",
  GENERAL_FITNESS: "Mejorar forma física",
  UNSURE: "Necesito ayuda para definir",
}

export const trainingHistoryLabelMap: Record<string, string> = {
  NONE: "No he entrenado antes",
  ONCE: "1 vez por semana",
  TWO_TO_THREE: "2 a 3 veces por semana",
  FOUR_PLUS: "4 o más veces por semana",
}

export const experienceLabelMap: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
  ELITE: "Élite",
}

export const scheduleLabelMap: Record<string, string> = {
  BEFORE_8AM: "Madrugada (5 a. m. – 8 a. m.)",
  "8AM_11AM": "Mañana (8 a. m. – 11 a. m.)",
  "11AM_2PM": "Mediodía (11 a. m. – 2 p. m.)",
  "2PM_5PM": "Tarde (2 p. m. – 5 p. m.)",
  "5PM_7PM": "Atardecer (5 p. m. – 7 p. m.)",
  "7PM_9PM": "Noche (7 p. m. – 9 p. m.)",
  AFTER_9PM: "Trasnoche (desde las 9 p. m.)",
}

// Recomendación con IA (#117): la pantalla avisa quién recomienda y con qué datos.
export const AI_RECOMMENDATION_NOTICE =
  "La rutina marcada como «Recomendada por IA» la sugiere una inteligencia artificial a partir de tu experiencia, tus días por semana, tu objetivo y si marcaste una lesión. No recibe tu nombre ni tus datos de contacto. Tú eliges cuál usar."

/** La rutina recomendada va primero; si no está en la lista, el orden no cambia. */
export function putRecommendedFirst<T extends { id: string }>(
  plans: T[],
  recommendedId: string | null | undefined
): T[] {
  const recommended = plans.find((plan) => plan.id === recommendedId)
  if (!recommended) return plans
  return [recommended, ...plans.filter((plan) => plan.id !== recommended.id)]
}
