export function canManageGymEquipment(
  user: { id: string; role: string; gymId: string | null },
  gym: { id: string; ownerId: string | null } | null
): boolean {
  if (user.role === "SUPER_ADMIN") return true
  return user.role === "ADMIN" && !!gym && user.gymId === gym.id
}
