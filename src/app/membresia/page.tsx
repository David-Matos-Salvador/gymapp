import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { MembresiaContent } from "./membresia-content"

export default async function MembresiaPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })

  if (!user) redirect("/login")
  if (user.role !== "MEMBER") redirect("/dashboard")

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: {
      plan: { include: { gym: { select: { name: true } } } },
      user: { select: { assignedTrainer: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  const plans = user.gymId
    ? await prisma.membershipPlan.findMany({
        where: { gymId: user.gymId, active: true },
        orderBy: { price: "asc" },
        select: { id: true, name: true, price: true, currency: true, durationDays: true },
      })
    : []

  const pendingPayment = await prisma.payment.findFirst({
    where: { userId: user.id, type: "MEMBERSHIP", status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      receiptUrl: true,
      createdAt: true,
    },
  })

  const serializedMembership = membership
    ? {
        id: membership.id,
        plan: {
          name: membership.plan.name,
          price: Number(membership.plan.price),
          currency: membership.plan.currency,
          durationDays: membership.plan.durationDays,
        },
        gym: membership.plan.gym ? { name: membership.plan.gym.name } : null,
        coach: membership.user.assignedTrainer
          ? { name: membership.user.assignedTrainer.name }
          : null,
        planPrice: membership.planPrice !== null ? Number(membership.planPrice) : null,
        planCurrency: membership.planCurrency,
        planDurationDays: membership.planDurationDays,
        status: membership.status,
        startDate: membership.startDate.toISOString(),
        endDate: membership.endDate.toISOString(),
        paymentConfirmed: membership.paymentConfirmed,
        paymentMethod: membership.paymentMethod,
        paymentRef: membership.paymentRef,
        autoRenew: membership.autoRenew,
      }
    : null

  const serializedPendingPayment = pendingPayment
    ? {
        ...pendingPayment,
        amount: Number(pendingPayment.amount),
        createdAt: pendingPayment.createdAt.toISOString(),
      }
    : null

  const serializedPlans = plans.map((plan) => ({ ...plan, price: Number(plan.price) }))

  return (
    <AppShell>
      <MembresiaContent
        membership={serializedMembership}
        pendingPayment={serializedPendingPayment}
        plans={serializedPlans}
      />
    </AppShell>
  )
}
