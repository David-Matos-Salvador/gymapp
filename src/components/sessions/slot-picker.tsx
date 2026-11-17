"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarX, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { bookAppointmentQuestion, type Slot } from "@/lib/coach-schedule"

const dayFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
})

/** "2026-11-16" → "lunes, 16 de noviembre". La fecha ya viene en la hora local del gimnasio. */
function formatDay(date: string) {
  return dayFormatter.format(new Date(`${date}T12:00:00Z`))
}

export function SlotPicker({
  slots,
  hasAvailability,
  coachName,
}: {
  slots: Slot[]
  hasAvailability: boolean
  coachName: string
}) {
  const router = useRouter()
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)

  async function book(slot: Slot) {
    // En el celular es fácil tocar una hora al desplazarse: se pregunta antes de reservar.
    if (!window.confirm(bookAppointmentQuestion(formatDay(slot.date), slot.time, coachName))) return
    setBookingSlot(slot.startsAt)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: slot.startsAt }),
      })
      if (res.ok) {
        toast.success("Sesión reservada")
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "No se pudo reservar la sesión")
      }
      // También tras un error: si la hora se ocupó, la lista debe dejar de mostrarla.
      router.refresh()
    } catch {
      toast.error("No se pudo reservar la sesión")
    } finally {
      setBookingSlot(null)
    }
  }

  if (slots.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={CalendarX}
            message={
              hasAvailability
                ? "Tu coach no tiene horas libres en los próximos días. Vuelve a revisar más tarde."
                : "Tu coach todavía no definió sus horas de atención."
            }
          />
        </CardContent>
      </Card>
    )
  }

  const days = [...new Set(slots.map((slot) => slot.date))]

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Cada sesión dura 60 minutos. Elige una hora:</p>
      {days.map((date) => {
        const label = formatDay(date)
        return (
          <Card key={date} data-testid={`slots-${date}`}>
            <CardContent className="space-y-3 py-4">
              <p className="font-medium first-letter:uppercase">{label}</p>
              <div className="flex flex-wrap gap-2">
                {slots
                  .filter((slot) => slot.date === date)
                  .map((slot) => (
                    <Button
                      key={slot.startsAt}
                      variant="outline"
                      size="sm"
                      disabled={bookingSlot !== null}
                      onClick={() => book(slot)}
                      aria-label={`Reservar el ${label} a las ${slot.time}`}
                    >
                      {bookingSlot === slot.startsAt && (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      )}
                      {slot.time}
                    </Button>
                  ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
