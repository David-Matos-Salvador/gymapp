"use client"

import { useState } from "react"
import { MembershipCard } from "@/components/memberships/membership-card"
import { PaymentForm } from "@/components/memberships/payment-form"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, CreditCard, Eye, Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatCurrency, formatDays } from "@/lib/utils"

interface MembershipData {
  id: string
  plan: {
    name: string
    price: number
    currency: string
    durationDays: number
  }
  planPrice: number | null
  planCurrency: string
  planDurationDays: number
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

interface PlanOption {
  id: string
  name: string
  price: number
  currency: string
  durationDays: number
}

export function MembresiaContent({
  membership,
  pendingPayment,
  plans,
}: {
  membership: MembershipData | null
  pendingPayment: PendingPayment | null
  plans: PlanOption[]
}) {
  const router = useRouter()

  if (!membership) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Membresía</h2>
          <p className="text-sm text-muted-foreground">Aún no tienes una membresía activa.</p>
        </div>
        {plans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                <CreditCard className="size-7 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Sin planes disponibles</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Tu gimnasio todavía no publicó planes. Consultá en recepción.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <NewMembershipForm plans={plans} />
        )}
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
        new Date(membership.endDate) > new Date() &&
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

function NewMembershipForm({ plans }: { plans: PlanOption[] }) {
  const router = useRouter()
  const [planId, setPlanId] = useState(plans[0]?.id ?? "")
  const [method, setMethod] = useState("YAPE")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const selectedPlan = plans.find((plan) => plan.id === planId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const free = selectedPlan?.price === 0
    if (!free && !file) {
      toast.error("Adjuntá un comprobante para que el gimnasio pueda revisarlo")
      return
    }
    setSubmitting(true)
    try {
      let res: Response
      if (free) {
        res = await fetch("/api/memberships/self", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        })
      } else {
        const formData = new FormData()
        formData.append("planId", planId)
        formData.append("method", method)
        formData.append("file", file!)
        res = await fetch("/api/payments", { method: "POST", body: formData })
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Error al registrar la membresía")
        return
      }
      toast.success("Comprobante enviado. El gimnasio lo revisará.")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="space-y-1">
          <p className="font-semibold">Elegí tu plan</p>
          <p className="text-sm text-muted-foreground">
            {selectedPlan?.price === 0
              ? "Este plan es gratuito: se activa al confirmar."
              : "Después de enviar el comprobante, el gimnasio confirmará tu pago."}
          </p>
        </div>
        <div className="space-y-2">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                planId === plan.id ? "border-accent-yellow bg-accent-yellow/5" : ""
              }`}
            >
              <span>
                <span className="block text-sm font-medium">{plan.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDays(plan.durationDays)}
                </span>
              </span>
              <span className="text-sm font-semibold">
                {plan.price === 0 ? "Gratis" : formatCurrency(plan.price, plan.currency)}
              </span>
              <input
                type="radio"
                name="planId"
                value={plan.id}
                checked={planId === plan.id}
                onChange={() => setPlanId(plan.id)}
                className="sr-only"
              />
            </label>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {selectedPlan?.price !== 0 && (
            <div className="space-y-2">
              <label htmlFor="newPaymentMethod" className="text-sm font-medium">
                Método de pago
              </label>
              <select
                id="newPaymentMethod"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="YAPE">Yape</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
              </select>
            </div>
          )}
          {selectedPlan?.price !== 0 && (
            <div className="space-y-2">
              <label htmlFor="newPaymentReceipt" className="text-sm font-medium">
                Comprobante
              </label>
              <input
                id="newPaymentReceipt"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
              />
            </div>
          )}
          <Button type="submit" disabled={submitting || !selectedPlan} className="w-full">
            {submitting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            {selectedPlan?.price === 0 ? "Activar plan gratis" : "Enviar comprobante"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
