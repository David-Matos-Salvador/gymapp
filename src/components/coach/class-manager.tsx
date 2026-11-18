"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Check, Loader2, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getBookingStatusLabel } from "@/lib/booking-status"

const DAYS = [
  ["MONDAY", "Lunes"],
  ["TUESDAY", "Martes"],
  ["WEDNESDAY", "Miércoles"],
  ["THURSDAY", "Jueves"],
  ["FRIDAY", "Viernes"],
  ["SATURDAY", "Sábado"],
  ["SUNDAY", "Domingo"],
] as const

interface ClassManagerProps {
  classItem: {
    id: string
    name: string
    description: string | null
    capacity: number
    duration: number
    dayOfWeek: string
    startTime: string
    bookings: Array<{
      id: string
      status: string
      user: { id: string; name: string | null; email: string }
    }>
  }
}

export function ClassManager({ classItem }: ClassManagerProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: classItem.name,
    description: classItem.description ?? "",
    capacity: String(classItem.capacity),
    duration: String(classItem.duration),
    dayOfWeek: classItem.dayOfWeek,
    startTime: classItem.startTime,
  })
  const [bookings, setBookings] = useState(classItem.bookings)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [attending, setAttending] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/classes/${classItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          capacity: Number(form.capacity),
          duration: Number(form.duration),
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Error al guardar la clase")
        return
      }
      toast.success("Clase actualizada")
      router.refresh()
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  async function handleAttendance(bookingId: string) {
    setAttending(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ATTENDED" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Error al marcar asistencia")
        return
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "ATTENDED" } : b))
      )
      toast.success("Asistencia marcada")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setAttending(null)
    }
  }

  async function handleCancelClass() {
    if (!window.confirm("¿Cancelar esta clase? Se cancelarán las reservas confirmadas.")) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/classes/${classItem.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Error al cancelar la clase")
        return
      }
      toast.success("Clase cancelada")
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Error de conexión")
    } finally {
      setCancelling(false)
    }
  }

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length

  return (
    <AppShell>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6 md:py-8">
        <Link
          href="/classes"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Volver a clases
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">{classItem.name}</h1>
          <p className="text-muted-foreground">
            {confirmed} reserva{confirmed !== 1 ? "s" : ""} confirmada{confirmed !== 1 ? "s" : ""}{" "}
            de {form.capacity}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-accent-yellow" /> Datos de la clase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="className">Nombre</Label>
              <Input
                id="className"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classDescription">Descripción</Label>
              <Input
                id="classDescription"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classDay">Día</Label>
                <select
                  id="classDay"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={form.dayOfWeek}
                  onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
                >
                  {DAYS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classTime">Hora</Label>
                <Input
                  id="classTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classDuration">Duración (min)</Label>
                <Input
                  id="classDuration"
                  type="number"
                  min={15}
                  max={240}
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classCapacity">Capacidad</Label>
                <Input
                  id="classCapacity"
                  type="number"
                  min={1}
                  max={200}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-yellow" /> Inscritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin reservas todavía</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {booking.user.name || booking.user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{booking.user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getBookingStatusLabel(booking.status)}
                    </span>
                    {booking.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAttendance(booking.id)}
                        disabled={attending === booking.id}
                      >
                        {attending === booking.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-3 w-3" />
                        )}
                        Asistió
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="border-t pt-6">
          <Button variant="destructive" onClick={handleCancelClass} disabled={cancelling}>
            {cancelling ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-4 w-4" />
            )}
            Cancelar clase
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
