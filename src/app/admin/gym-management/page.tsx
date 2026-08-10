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

  const gymExercises = user.gymId
    ? await prisma.gymExercise.findMany({
        where: { gymId: user.gymId },
        select: { exerciseId: true, active: true },
      })
    : []

  const gymExerciseMap = new Map(gymExercises.map((ge) => [ge.exerciseId, ge.active]))

  const systemEquipment = user.gymId
    ? await prisma.gymEquipment.findMany({ where: { isSystem: true }, orderBy: { name: "asc" } })
    : []

  const equipmentActivations = user.gymId
    ? await prisma.gymEquipmentActivation.findMany({
        where: { gymId: user.gymId },
        select: { equipmentId: true, active: true },
      })
    : []

  const equipActiveMap = new Map(equipmentActivations.map((a) => [a.equipmentId, a.active]))

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

  const canManageEquipment = canManageGymEquipment(user, gym)

  return (
    <AppShell>
      <GymManagementTabs
        exercises={JSON.parse(JSON.stringify(exercises))}
        gymExerciseMap={Object.fromEntries(gymExerciseMap)}
        plans={JSON.parse(JSON.stringify(plans))}
        members={JSON.parse(JSON.stringify(members))}
        currentUser={{ id: user.id, role: user.role }}
        systemEquipment={JSON.parse(JSON.stringify(systemEquipment))}
        equipActiveMap={Object.fromEntries(equipActiveMap)}
        gym={gym ? JSON.parse(JSON.stringify(gym)) : null}
        canManageEquipment={canManageEquipment}
      />
    </AppShell>
  )
}
