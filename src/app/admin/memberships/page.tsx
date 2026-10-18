import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
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
          gym: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const pendingPayments = await prisma.payment.findMany({
    where: { status: "PENDING", type: "MEMBERSHIP" },
    select: {
      id: true,
      userId: true,
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
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }))

  const serializedPendingPayments = pendingPayments.map((payment) => ({
    ...payment,
    createdAt: payment.createdAt.toISOString(),
  }))

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Membresías</h1>
          <p className="text-muted-foreground">
            Renovar extiende el período y deja el pago pendiente. Confirmar comprobante valida la
            captura subida por el miembro; Marcar pagado es para cobros manuales sin comprobante.
          </p>
          <Link
            href="/coach/payments"
            className="mt-2 inline-block text-sm text-accent-yellow hover:underline"
          >
            Revisar todos los comprobantes →
          </Link>
        </div>
        <MembershipPanel memberships={serialized} pendingPayments={serializedPendingPayments} />
      </div>
    </AppShell>
  )
}
