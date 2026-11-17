import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { BackButton } from "@/components/back-button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { AppointmentList } from "@/components/sessions/appointment-list"
import { SlotPicker } from "@/components/sessions/slot-picker"
import { getBookableCoach, hasActiveMembership } from "@/lib/appointments"
import { DEFAULT_TIMEZONE, formatAppointment } from "@/lib/coach-schedule"
import { refreshCalendarCacheIfStale } from "@/lib/calendar-sync"
import { getFreeSlots } from "@/lib/coach-schedule-db"

export const metadata: Metadata = {
  title: "Sesiones 1:1",
}

export default async function SessionsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { gym: { select: { timezone: true } } },
  })
  if (!user) redirect("/login")
  // El coach gestiona sus sesiones desde su agenda.
  if (user.role === "TRAINER") redirect("/coach/schedule")

  const timeZone = user.gym?.timezone || DEFAULT_TIMEZONE
  const lookup = await getBookableCoach(user)
  // Si el coach conectó su calendario, se lee de nuevo cuando la caché ya venció.
  if (lookup.ok) await refreshCalendarCacheIfStale(lookup.coach.id)

  const [appointments, membershipActive, free] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId: user.id, status: "CONFIRMED", startsAt: { gte: new Date() } },
      include: { trainer: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    hasActiveMembership(user.id),
    lookup.ok ? getFreeSlots(prisma, lookup.coach) : null,
  ])

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <div className="flex items-start gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sesiones 1:1</h1>
            <p className="text-muted-foreground">
              {lookup.ok
                ? `Reserva una hora con ${lookup.coach.name || "tu coach"}`
                : "Reserva una hora a solas con tu coach"}
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tus próximas sesiones</h2>
          <AppointmentList
            emptyMessage="Todavía no tienes sesiones reservadas"
            appointments={appointments.map((item) => ({
              id: item.id,
              when: formatAppointment(item.startsAt, timeZone),
              withName: item.trainer.name || "tu coach",
              durationMinutes: item.durationMinutes,
            }))}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Horas disponibles</h2>
          {!lookup.ok || !free ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={UserPlus}
                  message="Todavía no tienes un coach asignado. Cuando un coach te envíe una solicitud y la aceptes, podrás reservar aquí."
                />
              </CardContent>
            </Card>
          ) : !membershipActive ? (
            <Card>
              <CardContent className="space-y-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Necesitas una membresía activa y confirmada para reservar una sesión.
                </p>
                <Link href="/membresia" className="text-sm font-medium text-accent-yellow">
                  Ver mi membresía
                </Link>
              </CardContent>
            </Card>
          ) : (
            <SlotPicker
              slots={free.slots}
              hasAvailability={free.hasAvailability}
              coachName={lookup.coach.name || "tu coach"}
            />
          )}
        </section>
      </div>
    </AppShell>
  )
}
