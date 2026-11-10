import { prisma } from "@/lib/prisma"

export interface BookingClient {
  id: string
  name: string | null
  gymId: string | null
  assignedTrainerId: string | null
}

export type CoachLookup =
  | { ok: true; coach: { id: string; name: string | null; gymId: string } }
  | { ok: false; status: number; error: string }

/**
 * El coach con el que un cliente puede agendar: el que tiene asignado, y solo
 * si sigue siendo coach del mismo gimnasio.
 */
export async function getBookableCoach(client: BookingClient): Promise<CoachLookup> {
  if (!client.assignedTrainerId || !client.gymId) {
    return { ok: false, status: 403, error: "Todavía no tienes un coach asignado" }
  }
  const coach = await prisma.user.findUnique({
    where: { id: client.assignedTrainerId },
    select: { id: true, name: true, gymId: true, role: true },
  })
  if (
    !coach ||
    !coach.gymId ||
    coach.gymId !== client.gymId ||
    (coach.role !== "TRAINER" && coach.role !== "ADMIN")
  ) {
    return { ok: false, status: 403, error: "Todavía no tienes un coach asignado" }
  }
  return { ok: true, coach: { id: coach.id, name: coach.name, gymId: coach.gymId } }
}

export async function hasActiveMembership(userId: string, now: Date = new Date()) {
  const membership = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gt: now }, paymentConfirmed: true },
    select: { id: true },
  })
  return Boolean(membership)
}
