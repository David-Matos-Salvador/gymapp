"use client"

import { useState } from "react"
import { useSound } from "@/hooks/use-sound"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { CalendarDays, Clock, Users, User, CheckCircle2, X } from "lucide-react"
import { toast } from "sonner"

interface ClassItem {
  id: string
  name: string
  description: string | null
  dayOfWeek: string
  schedule: string
  duration: number
  capacity: number
  trainer: { name: string | null }
  bookings?: { id: string; userId: string; status: string }[]
}

interface Booking {
  id: string
  status: string
  classItem: ClassItem
}

interface ClassesViewProps {
  classes: ClassItem[]
  bookings: Booking[]
  userId: string
  userRole: string
}

const daysOfWeek: Record<string, string> = {
  MONDAY: "lunes", TUESDAY: "martes", WEDNESDAY: "miércoles",
  THURSDAY: "jueves", FRIDAY: "viernes", SATURDAY: "sábado", SUNDAY: "domingo",
}

const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]

export function ClassesView({ classes, bookings, userId, userRole }: ClassesViewProps) {
  const { play } = useSound()
  const [bookingIds, setBookingIds] = useState<Set<string>>(
    new Set(bookings.filter((b) => b.status === "CONFIRMED").map((b) => b.classItem.id))
  )
  const [loading, setLoading] = useState<string | null>(null)

  async function handleBook(classId: string) {
    setLoading(classId)
    play("select")
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    })

    if (res.ok) {
      setBookingIds((prev) => new Set([...prev, classId]))
      play("success")
      toast.success("Clase reservada")
    } else {
      const data = await res.json()
      toast.error(data.error ?? "Error al reservar")
    }
    setLoading(null)
  }

  async function handleCancel(classId: string) {
    const booking = bookings.find((b) => b.classItem.id === classId && b.status === "CONFIRMED")
    if (!booking) return

    setLoading(classId)
    play("delete")
    const res = await fetch("/api/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id }),
    })

    if (res.ok) {
      setBookingIds((prev) => {
        const next = new Set(prev)
        next.delete(classId)
        return next
      })
      toast.success("Reserva cancelada")
    } else {
      toast.error("Error al cancelar")
    }
    setLoading(null)
  }

  const sorted = [...classes].sort(
    (a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((cls, i) => {
        const time = new Date(cls.schedule).toLocaleTimeString("es", {
          hour: "2-digit",
          minute: "2-digit",
        })
        const booked = bookingIds.has(cls.id)
        const isFull = (cls.bookings ?? []).filter((b) => b.status === "CONFIRMED").length >= cls.capacity

        return (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className="h-full hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{cls.name}</CardTitle>
                  {booked && <CheckCircle2 className="h-5 w-5 text-gym-green" />}
                </div>
                {cls.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {daysOfWeek[cls.dayOfWeek] ?? cls.dayOfWeek}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {time} · {cls.duration}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {(cls.bookings ?? []).filter((b) => b.status === "CONFIRMED").length}/{cls.capacity}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {cls.trainer.name ?? "Sin asignar"}
                  </span>
                </div>

                {(userRole === "MEMBER" || userRole === "TRAINER") && (
                  booked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCancel(cls.id)}
                      disabled={loading === cls.id}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancelar reserva
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleBook(cls.id)}
                      disabled={loading === cls.id || isFull}
                    >
                      {isFull ? "Clase llena" : "Reservar lugar"}
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
