import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { RoutinesList } from "@/components/routines/routines-list"

export const metadata: Metadata = {
  title: "Rutinas",
}

export default async function RoutinesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) redirect("/login")

  if (user.role === "MEMBER") redirect("/my-routine")

  const userPlans = await prisma.routinePlan.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(user.gymId
          ? [{ user: { OR: [{ gymId: user.gymId }, { role: "SUPER_ADMIN" as const }] } }]
          : [{ user: { role: "SUPER_ADMIN" as const } }]),
      ],
    },
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const serializedPlans = userPlans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    exerciseCount: p.splits.reduce((sum, s) => sum + s.exercises.length, 0),
    totalDuration: p.splits.reduce((sum, s) => sum + (s.estimatedDuration ?? 45), 0),
    muscleGroups: [...new Set(p.splits.flatMap((s) => s.muscleGroups))],
  }))

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rutinas</h1>
            <p className="text-muted-foreground">
              {userPlans.length} plan{userPlans.length !== 1 ? "es" : ""}
            </p>
          </div>
        </div>

        <RoutinesList
          routines={serializedPlans}
          isCoach={user.role === "TRAINER" || user.role === "ADMIN"}
        />
      </div>
    </AppShell>
  )
}
