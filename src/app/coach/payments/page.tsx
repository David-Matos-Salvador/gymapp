"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { CreditCard, Check, X, Loader2, Mail, Clock, Eye } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { formatPaymentMethod, formatPaymentType } from "@/constants/payment"

interface PendingPayment {
  id: string
  amount: number
  currency: string
  status: string
  method: string
  receiptUrl: string | null
  reference: string | null
  notes: string | null
  type: string
  createdAt: string
  user: { id: string; name: string | null; email: string }
  membership: {
    id: string
    startDate: string
    endDate: string
    plan: { name: string } | null
  } | null
}

export default function CoachPaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null)

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch("/api/payments/pending")
        if (!res.ok) throw new Error("Error")
        const data = await res.json()
        setPayments(data.payments || [])
      } catch {
        toast.error("Error al cargar pagos")
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [])

  const handleConfirm = useCallback(async (paymentId: string) => {
    setProcessing(paymentId)
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM" }),
      })
      if (!res.ok) {
        toast.error("Error al confirmar")
        return
      }
      toast.success("Pago confirmado")
      setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    } catch {
      toast.error("Error de conexion")
    } finally {
      setProcessing(null)
    }
  }, [])

  const handleReject = useCallback(async (paymentId: string) => {
    const reason = window.prompt("Motivo del rechazo", "Comprobante ilegible")
    if (!reason?.trim()) return
    setProcessing(paymentId)
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          notes: reason.trim(),
        }),
      })
      if (!res.ok) {
        toast.error("Error al rechazar")
        return
      }
      toast.success("Pago rechazado")
      setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    } catch {
      toast.error("Error de conexion")
    } finally {
      setProcessing(null)
    }
  }, [])

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comprobantes</h1>
          <p className="text-muted-foreground">
            Bandeja de comprobantes: revisa la captura y confirma o rechaza el pago. El estado de la
            membresía lo gestiona el administrador.
          </p>
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <CreditCard className="size-6 text-muted-foreground" />
              </div>
              <p className="text-base font-medium">No hay pagos pendientes</p>
              <p className="text-sm text-muted-foreground mt-1">
                Los comprobantes subidos por tus clientes aparecerán aquí.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-yellow/10">
                            <CreditCard className="h-5 w-5 text-accent-yellow" />
                          </div>
                          <div>
                            <p className="font-semibold">{payment.user.name || "Sin nombre"}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {payment.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-semibold text-accent-yellow">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {formatPaymentMethod(payment.method)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {formatPaymentType(payment.type)}
                          </Badge>
                          {payment.reference && (
                            <span className="text-xs text-muted-foreground">
                              Ref. {payment.reference}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(payment.createdAt).toLocaleDateString("es-PE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {payment.membership && (
                          <p className="text-xs text-muted-foreground">
                            {payment.membership.plan?.name ?? "Membresía"} ·{" "}
                            {new Date(payment.membership.startDate).toLocaleDateString("es-PE")} —{" "}
                            {new Date(payment.membership.endDate).toLocaleDateString("es-PE")}
                          </p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground">Nota: {payment.notes}</p>
                        )}
                      </div>

                      {payment.receiptUrl ? (
                        <div className="shrink-0 space-y-2 w-full sm:w-[200px]">
                          <img
                            src={payment.receiptUrl}
                            alt="Comprobante de pago"
                            className="w-full h-36 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewReceipt(payment.receiptUrl)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs gap-1"
                            onClick={() => setPreviewReceipt(payment.receiptUrl)}
                          >
                            <Eye className="h-3 w-3" />
                            Ampliar comprobante
                          </Button>
                        </div>
                      ) : (
                        <div className="shrink-0 w-full sm:w-[200px]">
                          <div className="w-full h-36 rounded-lg border bg-muted flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">Sin comprobante</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(payment.id)}
                        disabled={processing === payment.id}
                      >
                        {processing === payment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(payment.id)}
                        disabled={processing === payment.id}
                      >
                        {processing === payment.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        Confirmar pago
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Receipt preview modal */}
        {previewReceipt && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setPreviewReceipt(null)}
          >
            <img
              src={previewReceipt}
              alt="Comprobante de pago"
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
