import { OBJECTIVE_LABELS } from "@/constants/user"

/**
 * Nombre de una rutina generada: «Cuerpo completo · Perder peso · 3 días». Es también la clave
 * con la que se reutiliza entre personas (la migración 20261121000100 renombró las viejas «· 3d»).
 */
export function generatedPlanName(
  templateName: string,
  objective: string,
  trainingFrequency: number
): string {
  const objectiveLabel = OBJECTIVE_LABELS[objective === "UNSURE" ? "GENERAL_FITNESS" : objective]
  return `${templateName} · ${objectiveLabel ?? "Mejorar forma física"} · ${trainingFrequency} días`
}

// Enfoques de plantilla que hablan de ganar músculo: con el objetivo de perder peso se leen como
// una contradicción («Quema de grasa» e «Hipertrofia» en la misma tarjeta, #202).
const MUSCLE_FOCUS = new Set(["Hipertrofia", "Crecimiento muscular", "Volumen"])

/** Enfoque que se muestra en la tarjeta de la rutina, o null si contradice el objetivo. */
export function focusForObjective(
  focus: string | undefined,
  objective: string | null | undefined
): string | null {
  if (!focus) return null
  if (objective === "WEIGHT_LOSS" && MUSCLE_FOCUS.has(focus)) return null
  return focus
}
