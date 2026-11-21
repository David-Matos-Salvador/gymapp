// Los objetivos que también se eligen en el onboarding usan el mismo nombre que ahí
// (`objectiveLabelMap`), para que la persona vea en su perfil lo que eligió.
export const OBJECTIVE_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Perder peso",
  MUSCLE_GAIN: "Ganar masa muscular",
  TONING: "Tonificación",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  GENERAL_FITNESS: "Mejorar forma física",
  REHABILITATION: "Rehabilitación",
  COMPETITION: "Competición",
}

export const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
  ELITE: "Élite",
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  TRAINER: "Coach",
  MEMBER: "Miembro",
  SUPER_ADMIN: "Súper Admin",
}

export const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  TRAINER: "secondary",
  MEMBER: "outline",
  SUPER_ADMIN: "default",
}

export const SEX_LABELS: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  OTHER: "Otro",
}

export const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Pecho",
  BACK: "Espalda",
  SHOULDERS: "Hombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  LEGS: "Piernas",
  GLUTES: "Glúteos",
  ABS: "Abdominales",
  CALVES: "Pantorrillas",
  FOREARMS: "Antebrazos",
  TRAPS: "Trapecios",
  FULL_BODY: "Cuerpo completo",
  CARDIO: "Cardio",
}

// La categoría del ejercicio es texto libre: el seed trae "Strength" y "Core" en inglés.
const CATEGORY_LABELS: Record<string, string> = {
  strength: "Fuerza",
}

export function formatExerciseCategory(category: string): string {
  return CATEGORY_LABELS[category.trim().toLowerCase()] ?? category
}

export function formatMuscleGroups(groups: string[], separator = ", "): string {
  return groups.map((g) => MUSCLE_LABELS[g] ?? g).join(separator)
}

const normalizeMuscle = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_]+/g, " ")

const MUSCLE_BY_TEXT = new Map(
  Object.entries(MUSCLE_LABELS).flatMap(([key, label]) => [
    [normalizeMuscle(key), key],
    [normalizeMuscle(label), key],
  ])
)

/**
 * "Pecho, bíceps" → ["CHEST", "BICEPS"]. El formulario de días muestra los músculos en español
 * (#139); acepta también el valor guardado ("CHEST"). Lo que no reconoce se guarda tal cual.
 */
export function parseMuscleGroups(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => MUSCLE_BY_TEXT.get(normalizeMuscle(part)) ?? part)
}

export const OBJECTIVES = Object.entries(OBJECTIVE_LABELS).map(([value, label]) => ({
  value,
  label,
}))
export const DIFFICULTIES = Object.entries(EXPERIENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}))
export const FREQUENCIES = [
  { value: "1", label: "1 día" },
  { value: "2", label: "2 días" },
  { value: "3", label: "3 días" },
  { value: "4", label: "4 días" },
  { value: "5", label: "5 días" },
  { value: "6", label: "6 días" },
  { value: "7", label: "7 días" },
]

export function calculateAge(birthDate: string | null): string | null {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age} años`
}

export function calculateAgeOrFallback(birthDate: string | null): string {
  return calculateAge(birthDate) ?? "-"
}
