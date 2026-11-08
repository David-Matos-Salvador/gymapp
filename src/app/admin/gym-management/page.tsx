import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { GymManagementTabs } from "@/components/admin/gym-management-tabs"
import { canManageGymEquipment } from "@/lib/gym-equipment"

interface GymManagementPageProps {
  searchParams: Promise<{ gymId?: string }>
}

export default async function GymManagementPage({ searchParams }: GymManagementPageProps) {
  const { gymId } = await searchParams
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) redirect("/login")

  const gyms =
    user.role === "SUPER_ADMIN"
      ? await prisma.gym.findMany({
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        })
      : []

  const requestedGymId =
    user.role === "SUPER_ADMIN" ? (gymId ?? user.gymId ?? gyms[0]?.id ?? null) : user.gymId
  const selectedGymId = gyms.some((g) => g.id === requestedGymId)
    ? requestedGymId
    : user.role === "SUPER_ADMIN"
      ? (user.gymId ?? gyms[0]?.id ?? null)
      : user.gymId

  const gym = selectedGymId
    ? await prisma.gym.findUnique({
        where: { id: selectedGymId },
        select: {
          id: true,
          ownerId: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          logoUrl: true,
          showMachineNumbers: true,
        },
      })
    : null

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const exercises = await prisma.exercise.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  })

  const gymExercises = selectedGymId
    ? await prisma.gymExercise.findMany({
        where: { gymId: selectedGymId },
        select: { exerciseId: true, active: true },
      })
    : []

  const gymExerciseMap = new Map(gymExercises.map((ge) => [ge.exerciseId, ge.active]))

  const systemEquipmentRaw = selectedGymId
    ? await prisma.gymEquipment.findMany({
        where: { isSystem: true },
        include: {
          activations: { where: { gymId: selectedGymId } },
          exercise: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      })
    : []

  const customEquipment = selectedGymId
    ? await prisma.gymEquipment.findMany({
        where: { gymId: selectedGymId },
        include: { exercise: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      })
    : []

  const systemEquipment = systemEquipmentRaw.map((equipment) => {
    const activation = equipment.activations[0]
    return {
      ...equipment,
      machineNumber: activation?.machineNumber ?? equipment.machineNumber,
      imageUrl: activation?.imageUrl ?? equipment.imageUrl,
      isSystem: true,
    }
  })

  const equipmentActivations = selectedGymId
    ? await prisma.gymEquipmentActivation.findMany({
        where: { gymId: selectedGymId },
        select: { equipmentId: true, active: true },
      })
    : []

  const equipActiveMap = new Map(equipmentActivations.map((a) => [a.equipmentId, a.active]))

  const plans = await prisma.routinePlan.findMany({
    where: selectedGymId ? { user: { gymId: selectedGymId } } : {},
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
    where: { role: "MEMBER", deletedAt: null, ...(selectedGymId ? { gymId: selectedGymId } : {}) },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      assignedTrainer: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  })

  const membershipPlans = selectedGymId
    ? await prisma.membershipPlan.findMany({
        where: { gymId: selectedGymId },
        orderBy: { price: "asc" },
      })
    : []

  const payments = selectedGymId
    ? await prisma.payment.findMany({
        where: { user: { gymId: selectedGymId } },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          method: true,
          reference: true,
          receiptUrl: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          confirmedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : []

  const serializedPayments = payments.map((payment) => ({
    id: payment.id,
    userName: payment.user.name,
    userEmail: payment.user.email,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    reference: payment.reference,
    receiptUrl: payment.receiptUrl,
    createdAt: payment.createdAt.toISOString(),
    confirmedByName: payment.confirmedBy?.name ?? null,
  }))

  const trainers = selectedGymId
    ? await prisma.user.findMany({
        where: { role: "TRAINER", gymId: selectedGymId, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { clients: true } },
        },
        orderBy: { name: "asc" },
      })
    : []

  const serializedTrainers = trainers.map((trainer) => ({
    id: trainer.id,
    name: trainer.name,
    email: trainer.email,
    clientCount: trainer._count.clients,
  }))

  const canManageEquipment = canManageGymEquipment(user, gym)

  return (
    <AppShell>
      {user.role === "SUPER_ADMIN" && gyms.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-6 flex flex-wrap gap-2">
          {gyms.map((item) => (
            <Link
              key={item.id}
              href={`/admin/gym-management?gymId=${item.id}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                item.id === selectedGymId
                  ? "border-accent-yellow bg-accent-yellow/10 text-accent-yellow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
      <GymManagementTabs
        exercises={JSON.parse(JSON.stringify(exercises))}
        gymExerciseMap={Object.fromEntries(gymExerciseMap)}
        plans={JSON.parse(JSON.stringify(plans))}
        membershipPlans={JSON.parse(JSON.stringify(membershipPlans))}
        members={JSON.parse(JSON.stringify(members))}
        currentUser={{ id: user.id, role: user.role }}
        systemEquipment={JSON.parse(JSON.stringify(systemEquipment))}
        initialCustomEquipment={JSON.parse(JSON.stringify(customEquipment))}
        equipActiveMap={Object.fromEntries(equipActiveMap)}
        gym={gym ? JSON.parse(JSON.stringify(gym)) : null}
        canManageEquipment={canManageEquipment}
        canManagePlans={user.role === "ADMIN" || user.role === "SUPER_ADMIN"}
        payments={serializedPayments}
        trainers={serializedTrainers}
      />
    </AppShell>
  )
}
