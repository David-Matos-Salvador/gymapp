import { prisma } from "@/lib/prisma"

/**
 * A trainer's clients are exactly the members assigned to them. TrainerRequest
 * is an intention/history record and never defines the relationship.
 */
export async function getTrainerClientIds(
  trainerId: string,
  gymId?: string | null
): Promise<string[]> {
  const clients = await prisma.user.findMany({
    where: {
      assignedTrainerId: trainerId,
      ...(gymId ? { gymId } : {}),
    },
    select: { id: true },
  })

  return clients.map((client) => client.id)
}

export async function hasAnyTrainer(clientId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: { assignedTrainerId: true },
  })

  return Boolean(user?.assignedTrainerId)
}
