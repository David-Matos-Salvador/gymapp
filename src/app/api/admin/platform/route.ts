import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const totalGyms = await prisma.gym.count()
  const totalUsers = await prisma.user.count({ where: { deletedAt: null } })
  const totalMembers = await prisma.user.count({ where: { role: "MEMBER", deletedAt: null } })
  const totalTrainers = await prisma.user.count({ where: { role: "TRAINER", deletedAt: null } })
  const activeMemberships = await prisma.membership.count({
    where: { status: "ACTIVE", paymentConfirmed: true, endDate: { gt: new Date() } },
  })
  const totalRevenue = await prisma.payment.aggregate({
    where: { status: "COMPLETED", type: "MEMBERSHIP" },
    _sum: { amount: true },
  })
  const todayCheckins = await prisma.checkIn.count({
    where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  })

  const gyms = await prisma.gym.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: "desc" },
  })

  const recentUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true, gymId: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return NextResponse.json({
    stats: {
      totalGyms,
      totalUsers,
      totalMembers,
      totalTrainers,
      activeMemberships,
      totalRevenue: totalRevenue._sum.amount || 0,
      todayCheckins,
    },
    gyms: gyms.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      active: g.active,
      address: g.address,
      phone: g.phone,
      email: g.email,
      logoUrl: g.logoUrl,
      showMachineNumbers: g.showMachineNumbers,
      ownerId: g.ownerId,
      userCount: g._count.users,
      createdAt: g.createdAt.toISOString(),
    })),
    recentUsers: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  })
}
