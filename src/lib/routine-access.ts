import { prisma } from "@/lib/prisma"

interface PlanUser {
  id: string
  role: string
  gymId: string | null
}

/**
 * Read access for routine plans:
 * - owner and SUPER_ADMIN always
 * - ADMIN for plans owned by users of their gym (read/duplicate only)
 * - MEMBER with an active assignment for the plan
 * No trainer-to-trainer visibility.
 */
export async function canReadPlan(planId: string, user: PlanUser): Promise<boolean> {
  const plan = await prisma.routinePlan.findUnique({
    where: { id: planId },
    select: { userId: true, user: { select: { gymId: true } } },
  })
  if (!plan) return false

  if (plan.userId === user.id || user.role === "SUPER_ADMIN") return true
  if (
    (user.role === "ADMIN" || user.role === "TRAINER") &&
    user.gymId &&
    plan.user.gymId === user.gymId
  ) {
    return true
  }
  if (user.role === "MEMBER") {
    const assignment = await prisma.assignedRoutinePlan.findFirst({
      where: { userId: user.id, planId, active: true },
      select: { id: true },
    })
    return Boolean(assignment)
  }
  return false
}

export function canEditPlan(planUserId: string, user: PlanUser): boolean {
  return planUserId === user.id || user.role === "SUPER_ADMIN"
}
