import { prisma } from "@/lib/prisma"

export async function getTrainerClientIds(trainerId: string): Promise<string[]> {
  const trainerRequests = await prisma.trainerRequest.findMany({
    where: { trainerId, status: "ACCEPTED" },
    select: { clientId: true },
  })

  const assignedClients = await prisma.user.findMany({
    where: { assignedTrainerId: trainerId },
    select: { id: true },
  })

  const idSet = new Set([
    ...trainerRequests.map((tr) => tr.clientId),
    ...assignedClients.map((c) => c.id),
  ])

  return Array.from(idSet)
}

export async function hasAnyTrainer(clientId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: { assignedTrainerId: true },
  })

  if (user?.assignedTrainerId) return true

  const acceptedRequest = await prisma.trainerRequest.findFirst({
    where: { clientId, status: "ACCEPTED" },
  })

  return !!acceptedRequest
}
