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
