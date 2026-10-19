import { prisma } from "@/lib/prisma"

export async function getDefaultGym() {
  return prisma.gym.findFirst({
    where: { isDefault: true, active: true },
    select: { id: true, name: true, showMachineNumbers: true },
  })
}

/**
 * Catalog gym for members without a physical gym: their own gym when present,
 * otherwise the default catalog gym. Operational features (memberships,
 * classes, invites) must use user.gymId directly, never this resolver.
 */
export async function getEffectiveGym(user: { gymId: string | null }) {
  if (user.gymId) {
    const gym = await prisma.gym.findUnique({
      where: { id: user.gymId },
      select: { id: true, name: true, showMachineNumbers: true },
    })
    if (gym) return gym
  }
  return getDefaultGym()
}
