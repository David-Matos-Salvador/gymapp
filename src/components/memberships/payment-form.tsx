"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, CreditCard, Banknote, ArrowLeftRight, CheckCircle2, Upload } from "lucide-react"

interface MembershipPlan {
  name: string
  price: number
  currency: string
  durationDays: number
}

interface PaymentFormProps {
  membershipId: string
  plan: MembershipPlan
  currentPaymentMethod?: string | null
  currentPaymentRef?: string | null
  onSuccess?: () => void
}

const paymentMethods = [
  { value: "CASH", label: "Efectivo", icon: Banknote },
  { value: "TRANSFER", label: "Transferencia", icon: ArrowLeftRight },
  { value: "CARD", label: "Tarjeta", icon: CreditCard },
]

export function PaymentForm({
  membershipId,
  plan,
  currentPaymentMethod,
  currentPaymentRef,
  onSuccess,
}: PaymentFormProps) {
  const [method, setMethod] = useState(currentPaymentMethod ?? "CASH")
  const [reference, setReference] = useState(currentPaymentRef ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (receiptFile) {
        const formData = new FormData()
        formData.append("file", receiptFile)
        formData.append("method", method)
        formData.append("membershipId", membershipId)
        if (method === "TRANSFER" && reference.trim()) {
          formData.append("reference", reference.trim())
        }

        const res = await fetch("/api/payments/receipt", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Error al subir comprobante")
      } else {
        const body: Record<string, unknown> = {
          paymentConfirmed: true,
          paymentMethod: method,
        }
        if (method === "TRANSFER" && reference.trim()) {
          body.paymentRef = reference.trim()
        }

        const res = await fetch(`/api/memberships/${membershipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Error al confirmar el pago")
        }
      }

      setSuccess(true)
      toast.success("Pago confirmado correctamente")
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el pago")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">Pago confirmado</p>
          <p className="text-sm text-muted-foreground">
            Tu membresía ha sido activada correctamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Confirmar pago</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-6 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{plan.name}</span>
            <span className="text-sm tabular-nums">
              {plan.currency.toUpperCase()} ${plan.price}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Duración</span>
            <span>{plan.durationDays} días</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payment-method">Método de pago</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>
                    <span className="flex items-center gap-2">
                      <pm.icon className="size-4" />
                      {pm.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === "TRANSFER" && (
            <div className="space-y-1.5">
              <Label htmlFor="payment-ref">Referencia de transferencia</Label>
              <Input
                id="payment-ref"
                placeholder="N° de referencia u operación"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Comprobante de pago (opcional)</Label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Subir comprobante
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
              {receiptFile && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{receiptFile.name}</span>}
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Confirmar pago"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
