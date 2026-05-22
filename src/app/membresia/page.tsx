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
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (user.role !== "MEMBER") redirect("/dashboard")

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })

  const serializedMembership = membership
    ? {
        id: membership.id,
        plan: {
          name: membership.plan.name,
          price: membership.plan.price,
          currency: membership.plan.currency,
          durationDays: membership.plan.durationDays,
        },
        status: membership.status,
        startDate: membership.startDate.toISOString(),
        endDate: membership.endDate.toISOString(),
        paymentConfirmed: membership.paymentConfirmed,
        paymentMethod: membership.paymentMethod,
        paymentRef: membership.paymentRef,
        autoRenew: membership.autoRenew,
      }
    : null

  return (
    <AppShell>
      <MembresiaContent membership={serializedMembership} />
    </AppShell>
  )
}
