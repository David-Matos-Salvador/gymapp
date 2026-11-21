"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCurrency, formatDate } from "@/lib/utils"
import { formatPaymentMethod } from "@/constants/payment"
import { CreditCard, ExternalLink, Search } from "lucide-react"

export interface PaymentRow {
  id: string
  userName: string | null
  userEmail: string
  amount: number
  currency: string
  status: string
  method: string
  reference: string | null
  receiptUrl: string | null
  createdAt: string
  confirmedByName: string | null
}

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
}

export function PaymentLedger({ payments }: { payments: PaymentRow[] }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("ALL")

  const filtered = payments.filter((payment) => {
    if (status !== "ALL" && payment.status !== status) return false
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      (payment.userName ?? "").toLowerCase().includes(query) ||
      payment.userEmail.toLowerCase().includes(query) ||
      (payment.reference ?? "").toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-gold" />
          Pagos del gimnasio
        </h2>
        <p className="text-sm text-muted-foreground">
          Historial de pagos registrados y comprobantes.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por miembro o referencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["ALL", "PENDING", "COMPLETED", "FAILED"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                status === value
                  ? "border-accent-yellow bg-accent-yellow/10 text-gold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "ALL" ? "Todos" : statusLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState message="No hay pagos que coincidan" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {payment.userName ?? payment.userEmail}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(payment.createdAt)} · {formatPaymentMethod(payment.method)}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </p>
                {payment.confirmedByName && (
                  <p className="text-[10px] text-muted-foreground">
                    Confirmado por {payment.confirmedByName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatCurrency(payment.amount, payment.currency)}
                </p>
                <Badge
                  variant={payment.status === "COMPLETED" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {statusLabels[payment.status] ?? payment.status}
                </Badge>
              </div>
              {payment.receiptUrl && (
                <a
                  href={payment.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver comprobante
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
