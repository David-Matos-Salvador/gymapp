"use client"

import { MembershipCard } from "@/components/memberships/membership-card"
import { PaymentForm } from "@/components/memberships/payment-form"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"

interface MembershipData {
  id: string
  plan: {
    name: string
    price: number
    currency: string
    durationDays: number
  }
  status: string
  startDate: string
  endDate: string
  paymentConfirmed: boolean
  paymentMethod: string
  paymentRef?: string | null
  autoRenew: boolean
}

export function MembresiaContent({ membership }: { membership: MembershipData | null }) {
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

      {!membership.paymentConfirmed && (
        <PaymentForm
          membershipId={membership.id}
          plan={membership.plan}
          currentPaymentMethod={membership.paymentMethod}
          currentPaymentRef={membership.paymentRef}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  )
}
