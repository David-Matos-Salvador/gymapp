import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { EquipmentCatalog } from "@/components/equipment/equipment-catalog"
import { GymEquipmentManager } from "@/components/gym-equipment/gym-equipment-manager"

export default async function EquipamientoPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, gymId: true, role: true },
  })

  if (!user) redirect("/login")

  const isStaff = user.role === "TRAINER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN"

  const equipment = user.gymId
    ? await prisma.gymEquipment.findMany({
        where: { gymId: user.gymId },
        include: { exercise: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      })
    : []

  if (isStaff) {
    const exercises = await prisma.exercise.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    return (
      <AppShell>
        <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Equipamiento</h1>
            <p className="text-muted-foreground">Gestiona el equipamiento del gimnasio</p>
          </div>
          <GymEquipmentManager
            initialEquipment={equipment.map((e) => ({
              id: e.id,
              name: e.name,
              category: e.category,
              location: e.location,
              imageUrl: e.imageUrl,
              exerciseId: e.exerciseId,
              exercise: e.exercise ? { id: e.exercise.id, name: e.exercise.name } : null,
            }))}
            exercises={exercises}
            gymId={user.gymId ?? undefined}
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Equipamiento</h1>
          <p className="text-muted-foreground">Catálogo de equipos de tu gimnasio</p>
        </div>
        <EquipmentCatalog equipment={equipment} hasGym={!!user.gymId} />
      </div>
    </AppShell>
  )
}
