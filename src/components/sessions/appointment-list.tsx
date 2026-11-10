"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

export interface AppointmentItem {
  id: string
  /** Fecha y hora ya formateadas en la zona horaria del gimnasio. */
  when: string
  withName: string
  durationMinutes: number
}

export function AppointmentList({
  appointments,
  emptyMessage,
}: {
  appointments: AppointmentItem[]
  emptyMessage: string
}) {
  const router = useRouter()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function cancel(id: string) {
    setCancellingId(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      if (res.ok) {
        toast.success("Sesión cancelada")
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "No se pudo cancelar la sesión")
      }
    } catch {
      toast.error("No se pudo cancelar la sesión")
    } finally {
      setCancellingId(null)
    }
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={CalendarClock} message={emptyMessage} />
        </CardContent>
      </Card>
    )
  }

  return (
    <ul className="space-y-2" data-testid="appointment-list">
      {appointments.map((item) => (
        <li key={item.id}>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-medium first-letter:uppercase">{item.when}</p>
                <p className="text-sm text-muted-foreground truncate">
                  Con {item.withName} · {item.durationMinutes} min
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={cancellingId === item.id}
                onClick={() => cancel(item.id)}
                aria-label={`Cancelar la sesión del ${item.when}`}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
