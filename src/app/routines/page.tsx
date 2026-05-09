import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { RoutinesList } from "@/components/routines/routines-list"

export default async function RoutinesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      routines: {
        include: {
          exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  })

  if (!user) redirect("/login")

  const hasCoach = !!user.assignedTrainerId
  let recommendedRoutines: typeof user.routines = []

  if (!hasCoach && user.role === "MEMBER") {
    recommendedRoutines = await prisma.routine.findMany({
      where: { assignedToId: null, userId: { not: user.id } },
      include: {
        exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    })
  }

  const serialized = user.routines.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    exerciseCount: r.exercises.length,
    totalDuration: Math.floor(r.exercises.reduce((sum, e) => sum + e.sets * e.reps * 3 + e.restSeconds, 0) / 60) || undefined,
    muscleGroups: [...new Set(r.exercises.map((re) => re.exercise.muscleGroup))],
  }))

  const serializedRecommended = recommendedRoutines.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    exerciseCount: r.exercises.length,
    totalDuration: Math.floor(r.exercises.reduce((sum, e) => sum + e.sets * e.reps * 3 + e.restSeconds, 0) / 60) || undefined,
    muscleGroups: [...new Set(r.exercises.map((re) => re.exercise.muscleGroup))],
  }))

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Rutinas</h1>
            <p className="text-muted-foreground">
              {user.routines.length} rutina{user.routines.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {serializedRecommended.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Rutinas recomendadas</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Sin coach asignado
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Estas rutinas son creadas por entrenadores de la plataforma. Selecciona una para empezar.
            </p>
            <RoutinesList
              routines={serializedRecommended}
              isCoach={false}
              recommended
            />
          </div>
        )}

        <RoutinesList
          routines={serialized}
          isCoach={user.role === "TRAINER" || user.role === "ADMIN"}
        />
      </div>
    </AppShell>
  )
}
