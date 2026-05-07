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
          exercises: {
            include: { exercise: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  })

  if (!user) redirect("/login")

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
        <RoutinesList routines={user.routines} isCoach={user.role === "TRAINER" || user.role === "ADMIN"} />
      </div>
    </AppShell>
  )
}
