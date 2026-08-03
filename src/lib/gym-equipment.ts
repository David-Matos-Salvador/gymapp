export function canManageGymEquipment(
  user: { id: string; role: string; gymId: string | null },
  gym: { id: string; ownerId: string | null } | null
): boolean {
  if (user.role === "SUPER_ADMIN") return true
  if (!gym) return false
  if (gym.ownerId === user.id) return true
  return user.role === "ADMIN" && user.gymId === gym.id
}
