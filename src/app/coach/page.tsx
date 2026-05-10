import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { CoachDashboard } from "@/components/coach/coach-dashboard"

export default async function CoachPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect("/login")
  if (user.role !== "TRAINER" && user.role !== "ADMIN") redirect("/dashboard")

  const clients = await prisma.user.findMany({
    where: { assignedTrainerId: user.id },
    select: {
      id: true, name: true, email: true, phone: true, objective: true, experienceLevel: true,
      memberShips: { include: { plan: true }, where: { status: "ACTIVE" }, take: 1 },
    },
    orderBy: { name: "asc" },
  })

  const plans = await prisma.routinePlan.findMany({
    where: { userId: user.id },
    include: {
      splits: { include: { exercises: { include: { exercise: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const classes = await prisma.class.findMany({
    where: { trainerId: user.id },
    include: { bookings: { where: { status: "CONFIRMED" } } },
    orderBy: { schedule: "asc" },
  })

  const now = new Date()
  const activeMemberships = clients.filter((c) =>
    c.memberShips.some((m) => m.status === "ACTIVE" && new Date(m.endDate) > now)
  ).length
  const upcomingClasses = classes.filter((c) => new Date(c.schedule) > now).length

  return (
    <AppShell>
      <CoachDashboard
        clients={clients.map((c) => ({
          id: c.id, name: c.name, email: c.email, phone: c.phone, objective: c.objective, experienceLevel: c.experienceLevel,
          hasActiveMembership: c.memberShips.some((m) => m.status === "ACTIVE" && new Date(m.endDate) > now),
          membershipPlan: c.memberShips[0]?.plan?.name ?? null,
        }))}
        routines={plans.map((p) => ({ id: p.id, name: p.name, exerciseCount: p.splits.reduce((sum, s) => sum + s.exercises.length, 0) }))}
        classes={classes.map((c) => ({
          id: c.id, name: c.name, dayOfWeek: c.dayOfWeek, duration: c.duration,
          capacity: c.capacity, bookingsCount: c.bookings.length, schedule: c.schedule.toISOString(),
        }))}
        stats={{ totalClients: clients.length, activeMemberships, upcomingClasses, totalRoutines: plans.length }}
        coach={{
          image: user.image,
          name: user.name ?? "Coach",
          bio: user.bio ?? null,
          specialties: user.specialties as string[] | null,
          yearsExperience: user.yearsExperience ?? null,
        }}
      />
    </AppShell>
  )
}
