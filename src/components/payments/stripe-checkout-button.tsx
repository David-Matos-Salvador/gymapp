"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, CreditCard } from "lucide-react"

interface StripeCheckoutButtonProps {
  planId: string
  planName: string
  price: number
}

export function StripeCheckoutButton({ planId, planName, price }: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Error al iniciar el pago")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de conexión al procesar el pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full gap-2"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirigiendo al pago...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          Pagar ${price} - {planName}
        </>
      )}
    </Button>
  )
}
