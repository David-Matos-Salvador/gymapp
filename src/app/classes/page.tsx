import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/layout/shell"
import { ClassesView } from "@/components/classes/classes-view"

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
          <p className="text-muted-foreground">Reserva tu lugar en clases grupales</p>
        </div>
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
