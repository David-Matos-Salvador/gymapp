import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { EquipmentCatalog } from "@/components/equipment/equipment-catalog"
import { canManageGymEquipment } from "@/lib/gym-equipment"

export default async function EquipamientoPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, gymId: true, role: true },
  })

  if (!user) redirect("/login")

  const gym = user.gymId
    ? await prisma.gym.findUnique({
        where: { id: user.gymId },
        select: { id: true, ownerId: true, showMachineNumbers: true },
      })
    : null

  if (canManageGymEquipment(user, gym)) {
    redirect("/admin/gym-management")
  }

  if (user.role === "TRAINER") {
    redirect("/dashboard")
  }

  const equipment = user.gymId
    ? await prisma.gymEquipment.findMany({
        where: { gymId: user.gymId },
        include: { exercise: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      })
    : []

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Equipamiento</h1>
          <p className="text-muted-foreground">Catálogo de equipos de tu gimnasio</p>
        </div>
        <EquipmentCatalog equipment={equipment} hasGym={!!user.gymId} showMachineNumbers={gym?.showMachineNumbers ?? false} />
      </div>
    </AppShell>
  )
}
