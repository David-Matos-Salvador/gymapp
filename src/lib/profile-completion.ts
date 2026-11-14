// Campos que cuentan para la barra «Perfil completado». Todos se pueden editar en /profile.
export const PROFILE_COMPLETION_FIELDS = [
  "name",
  "phone",
  "sex",
  "birthDate",
  "objective",
  "experienceLevel",
  "emergencyContact",
  "emergencyPhone",
] as const

export type ProfileCompletionField = (typeof PROFILE_COMPLETION_FIELDS)[number]

export function calculateProfileCompletion(user: Record<ProfileCompletionField, unknown>): number {
  const filled = PROFILE_COMPLETION_FIELDS.filter((field) => Boolean(user[field])).length
  return Math.round((filled / PROFILE_COMPLETION_FIELDS.length) * 100)
}
