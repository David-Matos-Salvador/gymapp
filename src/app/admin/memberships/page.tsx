import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin } from "@/lib/authz"
import { AppShell } from "@/components/layout/shell"
import { MembershipPanel } from "@/components/admin/membership-panel"

export const metadata: Metadata = {
  title: "Membresías",
}

export default async function AdminMembershipsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) redirect("/dashboard")

  const superadmin = isSuperAdmin(user.role)
  const gymScope = superadmin ? {} : { user: { gymId: user.gymId ?? "__no_gym__" } }

  const memberships = await prisma.membership.findMany({
    where: gymScope,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          gymId: true,
          assignedTrainer: { select: { name: true } },
        },
      },
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          durationDays: true,
          gymId: true,
          gym: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const pendingPayments = await prisma.payment.findMany({
    where: { status: "PENDING", type: "MEMBERSHIP", ...gymScope },
    select: {
      id: true,
      userId: true,
      membershipId: true,
      amount: true,
      currency: true,
      method: true,
      receiptUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const serialized = memberships.map((m) => ({
    ...m,
    planPrice: Number(m.planPrice ?? 0),
    plan: { ...m.plan, price: Number(m.plan.price) },
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }))

  const serializedPendingPayments = pendingPayments.map((payment) => ({
    ...payment,
    amount: Number(payment.amount),
    createdAt: payment.createdAt.toISOString(),
  }))

  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      deletedAt: null,
      ...(superadmin ? {} : { gymId: user.gymId ?? "__no_gym__" }),
    },
    select: { id: true, name: true, email: true, gymId: true },
    orderBy: { name: "asc" },
  })

  const plans = await prisma.membershipPlan.findMany({
    where: {
      active: true,
      ...(superadmin ? {} : { gymId: user.gymId ?? "__no_gym__" }),
    },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      durationDays: true,
      gymId: true,
      gym: { select: { name: true } },
    },
    orderBy: { price: "asc" },
  })

  const serializedPlans = plans.map((plan) => ({ ...plan, price: Number(plan.price) }))

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Membresías</h1>
          <p className="text-muted-foreground">
            Estado y vigencia de cada membresía (plan, gym, coach, fechas). Si hay un comprobante
            pendiente, usa <strong>Revisar comprobante</strong> para ver la captura y confirmar el
            pago. Si el socio avisó que paga en recepción, usa <strong>Revisar pago</strong> cuando
            recibas el dinero. <strong>Registrar pago manual</strong> es solo para efectivo, sin
            comprobante.
          </p>
        </div>
        <MembershipPanel
          memberships={serialized}
          pendingPayments={serializedPendingPayments}
          members={members}
          plans={serializedPlans}
        />
      </div>
    </AppShell>
  )
}
