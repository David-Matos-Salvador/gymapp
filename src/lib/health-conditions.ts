/**
 * Condiciones físicas que la persona marca en el onboarding (#202). Se guardan dentro de
 * `User.onboardingData`. El detalle («¿Cuál?») es opcional y lo ven solo el miembro y su coach:
 * no va a la IA ni al admin.
 */

export const CONDITION_DETAIL_MAX = 300

/** «No poseo» es el valor guardado para «Ninguna». */
const NO_CONDITION = "No poseo"

export function sanitizeConditionDetail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().slice(0, CONDITION_DETAIL_MAX)
  return trimmed || null
}

export interface HealthConditions {
  physicalConditions: string[]
  conditionDetail: string | null
}

/** Las condiciones guardadas en `onboardingData`, sin «Ninguna». */
export function healthConditionsOf(onboardingData: unknown): HealthConditions {
  const data =
    onboardingData && typeof onboardingData === "object"
      ? (onboardingData as Record<string, unknown>)
      : {}
  const physicalConditions = Array.isArray(data.physicalConditions)
    ? data.physicalConditions.filter(
        (item): item is string => typeof item === "string" && item !== NO_CONDITION
      )
    : []
  return {
    physicalConditions,
    conditionDetail:
      physicalConditions.length > 0 ? sanitizeConditionDetail(data.conditionDetail) : null,
  }
}

/** Embarazo o lesión: conviene consultar a un profesional antes de entrenar. */
export function needsProfessionalAdvice(conditions: string[]): boolean {
  return conditions.includes("Embarazo") || conditions.includes("Lesión")
}
