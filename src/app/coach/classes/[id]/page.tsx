import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ClassManager } from "@/components/coach/class-manager"

export const metadata: Metadata = {
  title: "Clase",
}

export default async function CoachClassPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, gymId: true },
  })
  if (!user) redirect("/login")

  const { id } = await params
  const classItem = await prisma.class.findUnique({
    where: { id },
    include: {
      trainer: { select: { id: true, name: true } },
      bookings: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const canManage =
    classItem &&
    classItem.active &&
    (user.role === "SUPER_ADMIN" ||
      (user.role === "ADMIN" && user.gymId === classItem.gymId) ||
      (user.role === "TRAINER" &&
        user.gymId === classItem.gymId &&
        classItem.trainerId === user.id))

  if (!classItem || !canManage) redirect("/classes")

  return (
    <ClassManager
      classItem={{
        id: classItem.id,
        name: classItem.name,
        description: classItem.description,
        capacity: classItem.capacity,
        duration: classItem.duration,
        dayOfWeek: classItem.dayOfWeek,
        startTime: classItem.startTime,
        bookings: classItem.bookings.map((booking) => ({
          id: booking.id,
          status: booking.status,
          user: booking.user,
        })),
      }}
    />
  )
}
