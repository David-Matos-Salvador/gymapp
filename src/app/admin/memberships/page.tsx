import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { MembershipPanel } from "@/components/admin/membership-panel"

export default async function AdminMembershipsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) redirect("/dashboard")

  const memberships = await prisma.membership.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true, price: true, currency: true, durationDays: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const serialized = memberships.map((m) => ({
    ...m,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }))

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Membresías</h1>
          <p className="text-muted-foreground">
            Gestión de pagos y estados de membresías
          </p>
        </div>
        <MembershipPanel memberships={serialized} />
      </div>
    </AppShell>
  )
}
