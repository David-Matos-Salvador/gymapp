// Campos que cuentan para la barra «Perfil completado», según el rol. Todos se pueden editar en
// /profile. El admin y el súper admin no tienen barra (decisión de David, issue #153).
const MEMBER_FIELDS = [
  "name",
  "phone",
  "sex",
  "birthDate",
  "objective",
  "experienceLevel",
  "emergencyContact",
  "emergencyPhone",
] as const

const TRAINER_FIELDS = ["name", "image", "phone", "bio"] as const

export type ProfileCompletionField =
  | (typeof MEMBER_FIELDS)[number]
  | (typeof TRAINER_FIELDS)[number]

export function getProfileCompletionFields(role: string): readonly ProfileCompletionField[] | null {
  if (role === "MEMBER") return MEMBER_FIELDS
  if (role === "TRAINER") return TRAINER_FIELDS
  return null
}

// null = el rol no tiene barra.
export function calculateProfileCompletion(
  user: { role: string } & Partial<Record<ProfileCompletionField, unknown>>
): number | null {
  const fields = getProfileCompletionFields(user.role)
  if (!fields) return null
  const filled = fields.filter((field) => Boolean(user[field])).length
  return Math.round((filled / fields.length) * 100)
}
