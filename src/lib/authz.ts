export type AppRole = "SUPER_ADMIN" | "ADMIN" | "TRAINER" | "MEMBER"

export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN"
}

export function isAdminOrAbove(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export function canAccessGym(
  user: { role: string; gymId: string | null },
  gymId: string | null | undefined
): boolean {
  if (isSuperAdmin(user.role)) return true
  return Boolean(user.gymId && gymId && user.gymId === gymId)
}

export function canEditGymField(role: string, field: string): boolean {
  if (isSuperAdmin(role)) return true
  if (role !== "ADMIN") return false
  return ["address", "phone", "email", "logoUrl", "showMachineNumbers"].includes(field)
}
