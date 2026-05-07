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
    include: {
      trainer: { select: { name: true } },
      bookings: { select: { id: true, userId: true, status: true } },
    },
    orderBy: { schedule: "asc" },
  })

  const serializedClasses = classes.map((c) => ({
    ...c,
    schedule: c.schedule.toISOString(),
  }))

  const serializedBookings = user.bookings.map((b) => ({
    ...b,
    classItem: {
      ...b.classItem,
      schedule: b.classItem.schedule.toISOString(),
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
          userId={user.id}
          userRole={user.role}
        />
      </div>
    </AppShell>
  )
}
