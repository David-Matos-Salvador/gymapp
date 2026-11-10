import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { BackButton } from "@/components/back-button"
import { ScheduleEditor } from "@/components/coach/schedule-editor"
import { AppointmentList } from "@/components/sessions/appointment-list"
import { DEFAULT_TIMEZONE, formatAppointment } from "@/lib/coach-schedule"

export default async function CoachSchedulePage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { gym: { select: { timezone: true } } },
  })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) redirect("/coach")

  const timeZone = user.gym?.timezone || DEFAULT_TIMEZONE

  const [blocks, appointments] = await Promise.all([
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
      </div>
    </AppShell>
  )
}
