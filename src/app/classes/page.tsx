import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import Link from "next/link"
import { ArrowRight, CalendarClock } from "lucide-react"
import { ClassesView } from "@/components/classes/classes-view"
import { getClassesSubtitle } from "@/lib/classes-subtitle"

export default async function ClassesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      bookings: {
        include: {
          classItem: {
            include: { trainer: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!user) redirect("/login")

  const classes = await prisma.class.findMany({
    where: { gymId: user.gymId ?? "__no_gym__", active: true },
    include: {
      trainer: { select: { name: true } },
      bookings: { select: { id: true, userId: true, status: true } },
    },
    orderBy: { startTime: "asc" },
  })

  const serializedClasses = classes.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    dayOfWeek: c.dayOfWeek,
    startTime: c.startTime,
    duration: c.duration,
    capacity: c.capacity,
    trainerId: c.trainerId,
    trainer: { name: c.trainer.name },
    confirmedCount: c.bookings.filter((b) => b.status === "CONFIRMED").length,
  }))

  const serializedBookings = user.bookings.map((b) => ({
    id: b.id,
    status: b.status,
    classItem: {
      id: b.classItem.id,
      name: b.classItem.name,
      description: b.classItem.description,
      dayOfWeek: b.classItem.dayOfWeek,
      startTime: b.classItem.startTime,
      duration: b.classItem.duration,
      capacity: b.classItem.capacity,
      trainerId: b.classItem.trainerId,
      trainer: { name: b.classItem.trainer.name },
      confirmedCount: 0,
    },
  }))

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clases</h1>
          <p className="text-muted-foreground">{getClassesSubtitle(user.role)}</p>
        </div>
        {user.assignedTrainerId && user.role !== "TRAINER" && (
          <Link
            href="/sessions"
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-accent-yellow" />
              <div>
                <p className="font-medium">Sesiones 1:1 con tu coach</p>
                <p className="text-sm text-muted-foreground">Reserva una hora a solas</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
        <ClassesView
          classes={serializedClasses}
          bookings={serializedBookings}
          userRole={user.role}
          userId={user.id}
        />
      </div>
    </AppShell>
  )
}
