"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CreditCard,
  Banknote,
  ArrowLeftRight,
  ReceiptText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import { formatPaymentMethod, formatPaymentType } from "@/constants/payment"

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  method: string
  type: string
  reference: string | null
  notes: string | null
  receiptUrl: string | null
  createdAt: string
  confirmedAt: string | null
}

const statusConfig: Record<
  string,
  {
    label: string
    variant: "default" | "destructive" | "outline" | "secondary"
    icon: typeof CheckCircle2
  }
> = {
  PENDING: { label: "Pendiente", variant: "outline", icon: Clock },
  COMPLETED: { label: "Completado", variant: "default", icon: CheckCircle2 },
  FAILED: { label: "Rechazado", variant: "destructive", icon: XCircle },
  REFUNDED: { label: "Reembolsado", variant: "secondary", icon: RefreshCw },
}

const methodIcons: Record<string, typeof Banknote> = {
  CASH: Banknote,
  TRANSFER: ArrowLeftRight,
  CARD: CreditCard,
  STRIPE: CreditCard,
  YAPE: CreditCard,
  OTHER: CreditCard,
}

function PaymentCard({ payment }: { payment: Payment }) {
  const statusInfo = statusConfig[payment.status] ?? {
    label: payment.status,
    variant: "outline" as const,
    icon: AlertCircle,
  }
  const StatusIcon = statusInfo.icon
  const MethodIcon = methodIcons[payment.method] ?? CreditCard

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{formatPaymentType(payment.type)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(payment.createdAt, { includeTime: true })}
              </p>
            </div>
          </div>
          <Badge variant={statusInfo.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MethodIcon className="h-3.5 w-3.5" />
            <span>{formatPaymentMethod(payment.method)}</span>
          </div>
          <span className="text-lg font-semibold tabular-nums">
            {formatCurrency(payment.amount, payment.currency)}
          </span>
        </div>

        {payment.reference && (
          <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
        )}

        {payment.notes && (
          <p className="text-xs text-muted-foreground">Motivo/nota: {payment.notes}</p>
        )}

        {payment.confirmedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Confirmado: {formatDate(payment.confirmedAt, { includeTime: true })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ProfilePayments() {
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch("/api/payments/my-payments")
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Error al cargar pagos")
        }
        const data = await res.json()
        setPayments(data.payments)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar pagos")
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/[0.03]">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Error al cargar pagos</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ReceiptText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Sin pagos registrados</p>
            <p className="text-xs text-muted-foreground">No tienes historial de pagos todavía</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {payments.map((payment) => (
        <PaymentCard key={payment.id} payment={payment} />
      ))}
    </motion.div>
  )
}
