import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { BackButton } from "@/components/back-button"
import { CalendarConnectionCard } from "@/components/coach/calendar-connection-card"
import { ScheduleEditor } from "@/components/coach/schedule-editor"
import { AppointmentList } from "@/components/sessions/appointment-list"
import { DEFAULT_TIMEZONE, formatAppointment } from "@/lib/coach-schedule"
import { isGoogleCalendarEnabled } from "@/lib/google-calendar"

const CALENDAR_NOTICES: Record<string, { tone: "ok" | "error"; text: string }> = {
  connected: { tone: "ok", text: "Tu calendario de Google quedó conectado." },
  denied: { tone: "error", text: "No diste permiso en Google, así que no se conectó nada." },
  error: { tone: "error", text: "No pudimos conectar tu calendario. Intenta de nuevo." },
  unavailable: {
    tone: "error",
    text: "La conexión con Google Calendar todavía no está disponible en este ambiente.",
  },
}

export default async function CoachSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { gym: { select: { timezone: true } } },
  })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) redirect("/coach")

  const timeZone = user.gym?.timezone || DEFAULT_TIMEZONE

  const { calendar } = await searchParams
  const notice = calendar ? (CALENDAR_NOTICES[calendar] ?? null) : null
  const calendarEnabled = isGoogleCalendarEnabled()

  const [blocks, appointments, connection] = await Promise.all([
    prisma.coachAvailability.findMany({
      where: { trainerId: user.id },
      select: { dayOfWeek: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: { trainerId: user.id, status: "CONFIRMED", startsAt: { gte: new Date() } },
      include: { client: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    // Solo estado y fechas: la credencial cifrada nunca sale hacia la página.
    prisma.coachCalendarConnection.findUnique({
      where: { trainerId: user.id },
      select: { status: true, lastSyncAt: true, _count: { select: { busyBlocks: true } } },
    }),
  ])

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl space-y-6">
        <div className="flex items-start gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mi agenda</h1>
            <p className="text-muted-foreground">
              Define en qué horas atiendes sesiones 1:1. Tus clientes reservan dentro de esas horas.
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Próximas sesiones</h2>
          <AppointmentList
            emptyMessage="Todavía no tienes sesiones reservadas"
            appointments={appointments.map((item) => ({
              id: item.id,
              when: formatAppointment(item.startsAt, timeZone),
              withName: item.client.name || "Cliente",
              durationMinutes: item.durationMinutes,
            }))}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Horas de atención</h2>
          <ScheduleEditor initialBlocks={blocks} />
        </section>

        {(calendarEnabled || connection) && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Calendario de Google</h2>
            <CalendarConnectionCard
              notice={notice}
              connection={
                connection
                  ? {
                      status: connection.status,
                      lastSync: connection.lastSyncAt
                        ? formatAppointment(connection.lastSyncAt, timeZone)
                        : null,
                      busyCount: connection._count.busyBlocks,
                    }
                  : null
              }
            />
          </section>
        )}
      </div>
    </AppShell>
  )
}
