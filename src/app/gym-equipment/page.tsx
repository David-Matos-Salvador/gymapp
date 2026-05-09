import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { GymEquipmentManager } from "@/components/gym-equipment/gym-equipment-manager"

export default async function GymEquipmentPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect("/login")
  if (user.role !== "TRAINER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const gymId = user.gymId ?? undefined

  const equipment = await prisma.gymEquipment.findMany({
    where: gymId ? { gymId } : undefined,
    include: { exercise: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  })

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
          gymId={gymId}
        />
      </div>
    </AppShell>
  )
}
