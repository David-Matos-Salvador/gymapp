"use client"

import { MembershipCard } from "@/components/memberships/membership-card"
import { PaymentForm } from "@/components/memberships/payment-form"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CreditCard, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

interface MembershipData {
  id: string
  plan: {
    name: string
    price: number
    currency: string
    durationDays: number
  }
  gym: { name: string } | null
  coach: { name: string | null } | null
  status: string
  startDate: string
  endDate: string
  paymentConfirmed: boolean
  paymentMethod: string
  paymentRef?: string | null
  autoRenew: boolean
}

interface PendingPayment {
  id: string
  amount: number
  currency: string
  receiptUrl: string | null
  createdAt: string
}

export function MembresiaContent({
  membership,
  pendingPayment,
}: {
  membership: MembershipData | null
  pendingPayment: PendingPayment | null
}) {
  const router = useRouter()

  if (!membership) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Membresía</h2>
          <p className="text-sm text-muted-foreground">Aún no tienes una membresía activa.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center space-y-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <CreditCard className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Sin membresía</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Adquirí un plan de membresía para desbloquear todas las funcionalidades del
                gimnasio.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Mi Membresía</h2>
        <p className="text-sm text-muted-foreground">Gestioná tu plan y métodos de pago</p>
      </div>

      <MembershipCard membership={membership} />

      {!membership.paymentConfirmed &&
        (pendingPayment ? (
          <Card>
            <CardContent className="space-y-3 py-6">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-accent-yellow" />
                <p className="font-semibold">Comprobante en revisión</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Recibimos tu comprobante por{" "}
                {formatCurrency(pendingPayment.amount, pendingPayment.currency)}. El equipo lo
                revisará y confirmará tu membresía. No necesitás subir otro comprobante.
              </p>
              {pendingPayment.receiptUrl && (
                <a
                  href={pendingPayment.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent-yellow hover:underline"
                >
                  <Eye className="size-4" />
                  Ver comprobante
                </a>
              )}
            </CardContent>
          </Card>
        ) : (
          <PaymentForm
            membershipId={membership.id}
            plan={membership.plan}
            currentPaymentMethod={membership.paymentMethod}
            currentPaymentRef={membership.paymentRef}
            onSuccess={() => router.refresh()}
          />
        ))}
    </div>
  )
}
