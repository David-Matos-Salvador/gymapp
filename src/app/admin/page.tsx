import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, Dumbbell, CalendarDays } from "lucide-react"

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.role !== "ADMIN") redirect("/dashboard")

  const totalUsers = await prisma.user.count()
  const totalRoutines = await prisma.routine.count()
  const totalClasses = await prisma.class.count()
  const totalBookings = await prisma.booking.count({ where: { status: "CONFIRMED" } })
  const totalPayments = await prisma.payment.count({ where: { status: "COMPLETED" } })

  const recentUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">Gestión general del gimnasio</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-t-2 border-t-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalUsers}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-gym-green">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rutinas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalRoutines}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-gym-violet">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalClasses}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-gym-orange">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reservas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalBookings}</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-chart-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalPayments}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {u.name?.[0] ?? u.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.name ?? "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground capitalize">
                    {u.role.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
