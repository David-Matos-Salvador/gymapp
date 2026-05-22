"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CreditCard, Banknote, ArrowLeftRight, RefreshCw } from "lucide-react"

interface MembershipPlan {
  name: string
  price: number
  currency: string
  durationDays: number
}

interface Membership {
  id: string
  plan: MembershipPlan
  status: string
  startDate: string
  endDate: string
  paymentConfirmed: boolean
  paymentMethod: string
  paymentRef?: string | null
  autoRenew: boolean
}

interface MembershipCardProps {
  membership: Membership
}

const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
  ACTIVE: { label: "Activa", variant: "secondary" },
  INACTIVE: { label: "Inactiva", variant: "outline" },
  EXPIRED: { label: "Vencida", variant: "destructive" },
  SUSPENDED: { label: "Suspendida", variant: "destructive" },
  CANCELLED: { label: "Cancelada", variant: "outline" },
}

const paymentMethodIcons: Record<string, typeof Banknote> = {
  CASH: Banknote,
  TRANSFER: ArrowLeftRight,
  CARD: CreditCard,
  STRIPE: CreditCard,
  OTHER: CreditCard,
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  STRIPE: "Stripe",
  OTHER: "Otro",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function MembershipCard({ membership }: MembershipCardProps) {
  const { plan, status, startDate, endDate, paymentConfirmed, paymentMethod, paymentRef, autoRenew } = membership
  const statusInfo = statusConfig[status] ?? { label: status, variant: "outline" as const }
  const PaymentIcon = paymentMethodIcons[paymentMethod] ?? CreditCard
  const isExpired = status === "EXPIRED" || (status === "ACTIVE" && new Date(endDate) < new Date())

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {formatDate(startDate)} — {formatDate(endDate)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm">
              <PaymentIcon className="size-3.5 text-muted-foreground" />
              <span>{paymentMethodLabels[paymentMethod] ?? paymentMethod}</span>
            </div>
            {paymentRef && (
              <p className="text-xs text-muted-foreground">Ref: {paymentRef}</p>
            )}
          </div>
          <span className="text-lg font-semibold tabular-nums">
            {plan.currency.toUpperCase()} ${plan.price}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              / {plan.durationDays}d
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {paymentConfirmed ? (
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Pagado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
              Pago pendiente
            </Badge>
          )}

          {autoRenew && (
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="size-3 mr-1" />
              Auto-renovación
            </Badge>
          )}
        </div>

        {isExpired && (
          <Button variant="outline" size="sm" className="w-full">
            <RefreshCw className="mr-2 size-3.5" />
            Renovar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
