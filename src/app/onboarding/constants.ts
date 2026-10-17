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
  { key: "bodyFat", label: "% Grasa", unit: "%", placeholder: "Ej: 18" },
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
  weight: number | null
  height: number | null
  usualSchedule: UsualSchedule | null
  measurements: MeasurementsInput
}

export interface GeneratedPlanData {
  id: string
  name: string
  description: string | null
  focus: string
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

export const TOTAL_STEPS = 10

export const STEPS = [
  { num: 1, title: "Objetivo" },
  { num: 2, title: "Historial" },
  { num: 3, title: "Experiencia" },
  { num: 4, title: "Frecuencia" },
  { num: 5, title: "Condiciones" },
  { num: 6, title: "Peso y altura" },
  { num: 7, title: "Medidas" },
  { num: 8, title: "Horario" },
  { num: 9, title: "Confirmación" },
  { num: 10, title: "Tu rutina" },
]

export type StepBehavior = "auto-advance" | "manual" | "custom-button" | "system-auto" | "final"

export const STEP_BEHAVIOR: Record<number, StepBehavior> = {
  1: "auto-advance",
  2: "auto-advance",
  3: "auto-advance",
  4: "auto-advance",
  5: "manual",
  6: "manual",
  7: "manual",
  8: "auto-advance",
  9: "custom-button",
  10: "custom-button",
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
    description: "No estoy seguro de mi objetivo",
    icon: HelpCircle,
  },
]

export const trainingHistoryOptions = [
  { value: "NONE", label: "No he entrenado antes", description: "Soy completamente nuevo" },
  { value: "ONCE", label: "1 vez por semana", description: "Entrenamiento ocasional" },
  { value: "TWO_TO_THREE", label: "2 a 3 veces por semana", description: "Entrenamiento regular" },
  { value: "FOUR_PLUS", label: "4 o más veces por semana", description: "Entrenamiento frecuente" },
]

export const experienceOptions = [
  {
    value: "BEGINNER",
    label: "Principiante",
    icon: HelpCircle,
    description: "Nunca he entrenado antes",
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
  { value: 4, label: "4 días por semana", description: "Balance óptimo — 4 días de entrenamiento" },
  { value: 5, label: "5 días por semana", description: "Máximo rendimiento — 5 días intensivos" },
]

export const physicalConditionOptions = [
  "Discapacidad",
  "Lesión",
  "Enfermedad",
  "Embarazo",
  "Otras",
  "No poseo",
]

export const scheduleOptions = [
  { value: "BEFORE_8AM", label: "Madrugada", time: "5am - 8am", icon: "🌅" },
  { value: "8AM_11AM", label: "Mañana", time: "8am - 11am", icon: "🌤️" },
  { value: "11AM_2PM", label: "Mediodía", time: "11am - 2pm", icon: "☀️" },
  { value: "2PM_5PM", label: "Tarde", time: "2pm - 5pm", icon: "🌤️" },
  { value: "5PM_7PM", label: "Atardecer", time: "5pm - 7pm", icon: "🌅" },
  { value: "7PM_9PM", label: "Noche", time: "7pm - 9pm", icon: "🌙" },
  { value: "AFTER_9PM", label: "Madrugada", time: "9pm+", icon: "🌑" },
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
  NONE: "No he entrenado",
  ONCE: "1x por semana",
  TWO_TO_THREE: "2x a 3x",
  FOUR_PLUS: "4x o más",
}

export const experienceLabelMap: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
  ELITE: "Élite",
}

export const scheduleLabelMap: Record<string, string> = {
  BEFORE_8AM: "Madrugada (5am-8am)",
  "8AM_11AM": "Mañana (8am-11am)",
  "11AM_2PM": "Mediodía (11am-2pm)",
  "2PM_5PM": "Tarde (2pm-5pm)",
  "5PM_7PM": "Atardecer (5pm-7pm)",
  "7PM_9PM": "Noche (7pm-9pm)",
  AFTER_9PM: "Noche (después de 9pm)",
}
