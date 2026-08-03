import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { GymManagementTabs } from "@/components/admin/gym-management-tabs"
import { canManageGymEquipment } from "@/lib/gym-equipment"

export default async function GymManagementPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) redirect("/login")

  const gym = user.gymId
    ? await prisma.gym.findUnique({
        where: { id: user.gymId },
        select: { id: true, ownerId: true, showMachineNumbers: true },
      })
    : null

  const isGymOwner = !!gym && gym.ownerId === user.id
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !isGymOwner) redirect("/dashboard")

  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
  })

  const plans = await prisma.routinePlan.findMany({
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })

  const equipment = user.gymId
    ? await prisma.gymEquipment.findMany({
        where: { gymId: user.gymId },
        include: { exercise: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      })
    : []

  const canManageEquipment = canManageGymEquipment(user, gym)

  return (
    <AppShell>
      <GymManagementTabs
        exercises={JSON.parse(JSON.stringify(exercises))}
        plans={JSON.parse(JSON.stringify(plans))}
        members={JSON.parse(JSON.stringify(members))}
        currentUser={{ id: user.id, role: user.role }}
        equipment={JSON.parse(JSON.stringify(equipment))}
        gym={gym ? JSON.parse(JSON.stringify(gym)) : null}
        canManageEquipment={canManageEquipment}
      />
    </AppShell>
  )
}
