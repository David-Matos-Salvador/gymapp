import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) redirect("/dashboard")

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)
  startOfWeek.setHours(0, 0, 0, 0)
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + 7)

  const totalActiveMemberships = await prisma.membership.count({
    where: { status: "ACTIVE", endDate: { gt: now } },
  })

  const monthMemberships = await prisma.membership.findMany({
    where: {
      paymentConfirmed: true,
      startDate: { gte: startOfMonth },
    },
    include: { plan: { select: { price: true } } },
  })
  const monthlyIncome = monthMemberships.reduce((sum, m) => sum + m.plan.price, 0)

  const newMembersThisMonth = await prisma.user.count({
    where: {
      role: { in: ["MEMBER", "TRAINER"] },
      createdAt: { gte: startOfMonth },
    },
  })

  const weeklyCheckIns = await prisma.checkIn.count({
    where: { date: { gte: startOfWeek } },
  })
  const avgDailyAttendance = Math.round((weeklyCheckIns / 7) * 10) / 10

  const expiringMemberships = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gt: now, lte: nextWeek },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { name: true } },
    },
    orderBy: { endDate: "asc" },
    take: 20,
  })

  const recentCheckIns = await prisma.checkIn.findMany({
    orderBy: { date: "desc" },
    take: 20,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return (
    <AppShell>
      <AdminDashboard
        stats={{
          totalActiveMemberships,
          monthlyIncome,
          newMembersThisMonth,
          avgDailyAttendance,
        }}
        expiringMemberships={expiringMemberships.map((m) => ({
          id: m.id,
          userName: m.user.name ?? m.user.email,
          planName: m.plan.name,
          endDate: m.endDate.toISOString(),
        }))}
        recentCheckIns={recentCheckIns.map((c) => ({
          id: c.id,
          userName: c.user.name ?? c.user.email,
          date: c.date.toISOString(),
        }))}
      />
    </AppShell>
  )
}
