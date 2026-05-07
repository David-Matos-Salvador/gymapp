import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Dumbbell, Users, CalendarDays } from "lucide-react"

export default async function CoachPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect("/login")
  if (user.role !== "TRAINER" && user.role !== "ADMIN") redirect("/dashboard")

  const routines = await prisma.routine.findMany({
    where: { userId: user.id },
    include: {
      exercises: { include: { exercise: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const classes = await prisma.class.findMany({
    where: { trainerId: user.id },
    include: {
      bookings: { where: { status: "CONFIRMED" } },
    },
    orderBy: { schedule: "asc" },
  })

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Coach Panel</h1>
            <p className="text-muted-foreground">Gestiona rutinas y clases</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-t-2 border-t-gym-green">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mis Rutinas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{routines.length}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-gym-violet">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mis Clases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{classes.length}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-gym-orange">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reservas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {classes.reduce((sum, c) => sum + c.bookings.length, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rutinas creadas</CardTitle>
              <Button size="sm" asChild>
                <Link href="/routines/new">
                  <Plus className="mr-1 h-4 w-4" /> Nueva rutina
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {routines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No has creado rutinas aún</p>
              ) : (
                <div className="space-y-2">
                  {routines.map((r) => (
                    <Link
                      key={r.id}
                      href={`/routines/${r.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gym-green/10">
                        <Dumbbell className="h-4 w-4 text-gym-green" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.exercises.length} ejercicios</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mis clases</CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No tienes clases programadas</p>
              ) : (
                <div className="space-y-2">
                  {classes.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gym-violet/10">
                        <CalendarDays className="h-4 w-4 text-gym-violet" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.dayOfWeek} · {c.duration}min · {c.bookings.length}/{c.capacity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
