"use client"

import { useState } from "react"
import { useSound } from "@/hooks/use-sound"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Clock,
  Users,
  User,
  CheckCircle2,
  X,
  CalendarPlus,
  Settings,
} from "lucide-react"
import { toast } from "sonner"
import { initialBookingState, withBooking, withoutBooking } from "./booking-state"

interface ClassItem {
  id: string
  name: string
  description: string | null
  dayOfWeek: string
  startTime: string
  duration: number
  capacity: number
  trainerId: string
  trainer: { name: string | null }
  confirmedCount: number
}

interface Booking {
  id: string
  status: string
  classItem: ClassItem
}

interface ClassesViewProps {
  classes: ClassItem[]
  bookings: Booking[]
  userRole: string
  userId: string
}

const daysOfWeek: Record<string, string> = {
  MONDAY: "lunes",
  TUESDAY: "martes",
  WEDNESDAY: "miércoles",
  THURSDAY: "jueves",
  FRIDAY: "viernes",
  SATURDAY: "sábado",
  SUNDAY: "domingo",
}

const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]

const dayToIndex: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
}

function nextOccurrence(dayOfWeek: string, startTime: string): Date {
  const now = new Date()
  const target = dayToIndex[dayOfWeek] ?? 1
  const [h, m] = startTime.split(":").map(Number)
  const d = new Date(now)
  d.setDate(now.getDate() + ((target - now.getDay() + 7) % 7))
  d.setHours(h || 0, m || 0, 0, 0)
  if (d <= now) d.setDate(d.getDate() + 7)
  return d
}

function formatGoogleDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function buildCalendarUrl(cls: ClassItem): string {
  const start = nextOccurrence(cls.dayOfWeek, cls.startTime)
  const end = new Date(start.getTime() + cls.duration * 60000)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: cls.name,
    dates: `${formatGoogleDate(start)}/${formatGoogleDate(end)}`,
    details: cls.description ?? "",
    recur: "RRULE:FREQ=WEEKLY",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function ClassesView({ classes, bookings, userRole, userId }: ClassesViewProps) {
  const router = useRouter()
  const { play } = useSound()
  // La reserva y el contador viven en el estado: así se puede cancelar una reserva
  // recién hecha y los lugares cambian al momento, sin recargar la página (#130).
  const [bookingState, setBookingState] = useState(() => initialBookingState(classes, bookings))
  const [loading, setLoading] = useState<string | null>(null)

  async function handleBook(classId: string) {
    setLoading(classId)
    play("select")
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    })

    const data = await res.json().catch(() => ({}))
    if (res.ok && data.booking?.id) {
      setBookingState((prev) => withBooking(prev, classId, data.booking.id))
      play("success")
      toast.success("Clase reservada")
    } else if (res.ok) {
      // Se reservó pero no llegó el dato de la reserva: se vuelve a pedir todo al servidor.
      toast.success("Clase reservada")
      window.location.reload()
    } else {
      // Sin membresía activa: el aviso del miembro lo lleva a donde se resuelve.
      const goToMembership = data.code === "MEMBERSHIP_REQUIRED" && userRole === "MEMBER"
      toast.error(
        data.error ?? "Error al reservar",
        goToMembership
          ? { action: { label: "Ver membresía", onClick: () => router.push("/membresia") } }
          : undefined
      )
    }
    setLoading(null)
  }

  async function handleCancel(classId: string) {
    const bookingId = bookingState.bookingIdByClass[classId]
    if (!bookingId) return

    setLoading(classId)
    play("delete")
    const res = await fetch("/api/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    })

    if (res.ok) {
      setBookingState((prev) => withoutBooking(prev, classId))
      toast.success("Reserva cancelada")
    } else {
      toast.error("Error al cancelar")
    }
    setLoading(null)
  }

  const sorted = [...classes].sort(
    (a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)
  )

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarDays className="mx-auto mb-4 size-10 text-muted-foreground" />
          <p className="font-medium">Aún no hay clases programadas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando el gimnasio publique clases, aparecerán aquí.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((cls, i) => {
        const booked = Boolean(bookingState.bookingIdByClass[cls.id])
        const confirmedCount = bookingState.countByClass[cls.id] ?? cls.confirmedCount
        const isFull = confirmedCount >= cls.capacity

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
                  {booked && <CheckCircle2 className="h-5 w-5 text-accent-yellow" />}
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
                    {cls.startTime} · {cls.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {confirmedCount}/{cls.capacity}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {cls.trainer.name ?? "Sin asignar"}
                  </span>
                </div>

                {userRole === "TRAINER" && cls.trainerId === userId ? (
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/coach/classes/${cls.id}`}>
                      <Settings className="mr-1 h-3 w-3" /> Gestionar clase
                    </Link>
                  </Button>
                ) : (
                  (userRole === "MEMBER" || userRole === "TRAINER") &&
                  (booked ? (
                    <div className="space-y-2">
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
                      <Button asChild variant="ghost" size="sm" className="w-full">
                        <a href={buildCalendarUrl(cls)} target="_blank" rel="noopener noreferrer">
                          <CalendarPlus className="mr-1 h-3 w-3" />
                          Añadir a Google Calendar
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleBook(cls.id)}
                      disabled={loading === cls.id || isFull}
                    >
                      {isFull ? "Clase llena" : "Reservar lugar"}
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
