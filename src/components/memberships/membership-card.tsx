"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Smartphone,
  RefreshCw,
  Loader2,
  Building2,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatCurrency, formatDays } from "@/lib/utils"
import { canRenewMembership } from "@/lib/membership-status"
import { PAYMENT_METHOD_LABELS as paymentMethodLabels } from "@/constants/payment"

interface MembershipPlan {
  name: string
  price: number
  currency: string
  durationDays: number
}

interface Membership {
  id: string
  plan: MembershipPlan
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

interface MembershipCardProps {
  membership: Membership
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  ACTIVE: { label: "Activa", variant: "secondary" },
  PENDING_PAYMENT: { label: "Pago pendiente", variant: "outline" },
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
  YAPE: Smartphone,
  OTHER: CreditCard,
}

export function MembershipCard({ membership }: MembershipCardProps) {
  const {
    plan,
    planPrice,
    planCurrency,
    planDurationDays,
    gym,
    coach,
    status,
    startDate,
    endDate,
    paymentConfirmed,
    paymentMethod,
    paymentRef,
    autoRenew,
  } = membership
  const [now] = useState(() => Date.now())
  const endTime = new Date(endDate).getTime()
  const effectiveStatus =
    status === "ACTIVE" && endTime < now
      ? "EXPIRED"
      : status === "ACTIVE" && !paymentConfirmed
        ? "PENDING_PAYMENT"
        : status
  const statusInfo = statusConfig[effectiveStatus] ?? {
    label: effectiveStatus,
    variant: "outline" as const,
  }
  const PaymentIcon = paymentMethodIcons[paymentMethod] ?? CreditCard
  const renewable = canRenewMembership({ status, endDate, paymentConfirmed })
  const router = useRouter()
  const [renewing, setRenewing] = useState(false)

  async function handleRenew() {
    setRenewing(true)
    try {
      // D-01/D-08: server-calculated renewal for the authenticated owner only.
      const res = await fetch(`/api/memberships/${membership.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renew: true }),
      })
      if (res.status === 409) {
        const data = await res.json()
        if (data.code === "PRICE_CHANGED" && data.current) {
          const accepted = window.confirm(
            `El nuevo precio es ${data.current.currency} ${Number(data.current.price).toFixed(2)} por ${data.current.durationDays} días (antes ${data.current.previousCurrency} ${Number(data.current.previousPrice).toFixed(2)}). ¿Aceptas renovar con el nuevo precio?`
          )
          if (!accepted) {
            toast.info("No se renovó. Tu membresía vence en la fecha actual.")
            return
          }
          const retry = await fetch(`/api/memberships/${membership.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ renew: true, acceptNewPrice: true }),
          })
          if (!retry.ok) {
            const retryData = await retry.json()
            throw new Error(retryData.error ?? "Error al renovar")
          }
          toast.success("Membresía renovada con el nuevo precio. Confirma tu pago.")
          router.refresh()
          return
        }
        throw new Error(data.error ?? "Error al renovar")
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al renovar")
      }
      toast.success("Membresía renovada. Confirma tu pago.")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renovar membresía")
    } finally {
      setRenewing(false)
    }
  }

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
          <span className="flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            {gym?.name ?? "Gimnasio no asignado"}
          </span>
          <span className="flex items-center gap-1.5">
            <UserRound className="size-3.5" />
            {coach?.name ?? "Sin coach asignado"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-sm">
              <PaymentIcon className="size-3.5 text-muted-foreground" />
              <span>{paymentMethodLabels[paymentMethod] ?? paymentMethod}</span>
            </div>
            {paymentRef && <p className="text-xs text-muted-foreground">Ref: {paymentRef}</p>}
          </div>
          <span className="text-lg font-semibold tabular-nums">
            {formatCurrency(Number(planPrice ?? plan.price), planCurrency)}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              / {formatDays(planDurationDays || plan.durationDays)}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {paymentConfirmed ? (
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            >
              Pagado
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800"
            >
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

        {renewable && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleRenew}
            disabled={renewing}
          >
            {renewing ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-3.5" />
            )}
            {renewing ? "Renovando..." : "Renovar"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
