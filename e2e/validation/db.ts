import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function readDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const envPath = resolve(process.cwd(), ".env")
  const content = readFileSync(envPath, "utf8")
  const line = content
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.startsWith("DATABASE_URL="))

  if (!line) throw new Error("DATABASE_URL no está definida en .env")

  return line
    .slice("DATABASE_URL=".length)
    .trim()
    .replace(/^["']|["']$/g, "")
}

const adapter = new PrismaPg({ connectionString: readDatabaseUrl() })

export const prisma = new PrismaClient({ adapter })

export async function findUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error(`Usuario no encontrado: ${email}`)
  return user
}

export async function expireMembership(email: string) {
  const user = await findUser(email)
  const endDate = new Date(Date.now() - 86_400_000)

  await prisma.membership.updateMany({
    where: { userId: user.id },
    data: { status: "EXPIRED", endDate },
  })

  return { userId: user.id, endDate }
}

export async function renewMembership(email: string, days = 30) {
  const user = await findUser(email)
  const now = new Date()
  const endDate = new Date(now.getTime() + days * 86_400_000)

  const current = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { endDate: "desc" },
  })

  const planId = current?.planId ?? (await prisma.membershipPlan.findFirst())?.id
  if (!planId) throw new Error("No hay planes de membresía para renovar")

  const membership = await prisma.membership.upsert({
    where: { userId_planId: { userId: user.id, planId } },
    update: {
      status: "ACTIVE",
      startDate: now,
      endDate,
      paymentConfirmed: true,
    },
    create: {
      userId: user.id,
      planId,
      status: "ACTIVE",
      startDate: now,
      endDate,
      paymentConfirmed: true,
      paymentMethod: "CASH",
    },
  })

  return membership
}

export async function expireInvite(token: string) {
  const invite = await prisma.trainerInvite.findUnique({ where: { token } })
  if (!invite) throw new Error(`Invitación no encontrada: ${token}`)

  return prisma.trainerInvite.update({
    where: { token },
    data: { status: "EXPIRED", expiresAt: new Date(Date.now() - 86_400_000) },
  })
}

export async function countWorkouts(email: string) {
  const user = await findUser(email)
  return prisma.workoutLog.count({ where: { userId: user.id } })
}

export async function createPendingMembership(email: string, days = 30) {
  const user = await findUser(email)
  const plan = await prisma.membershipPlan.findFirst()
  if (!plan) throw new Error("No hay planes de membresía")

  const now = new Date()
  const endDate = new Date(now.getTime() + days * 86_400_000)

  return prisma.membership.upsert({
    where: { userId_planId: { userId: user.id, planId: plan.id } },
    update: {
      status: "ACTIVE",
      startDate: now,
      endDate,
      paymentConfirmed: false,
    },
    create: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      startDate: now,
      endDate,
      paymentConfirmed: false,
      paymentMethod: "CASH",
    },
  })
}

export async function getMembership(email: string) {
  const user = await findUser(email)
  return prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  })
}

export async function countMeasurements(email: string) {
  const user = await findUser(email)
  return prisma.bodyMeasurement.count({ where: { userId: user.id } })
}

export async function countUsers() {
  return prisma.user.count()
}

export async function getClassBookingCount(name: string) {
  const classItem = await prisma.class.findFirst({
    where: { name },
    include: { bookings: { where: { status: "CONFIRMED" } } },
  })
  return classItem?.bookings.length ?? 0
}

export async function hasBookingForClass(email: string, name: string) {
  const user = await findUser(email)
  const classItem = await prisma.class.findFirst({ where: { name } })
  if (!classItem) return false
  const booking = await prisma.booking.findFirst({
    where: { userId: user.id, classId: classItem.id, status: "CONFIRMED" },
  })
  return Boolean(booking)
}

export async function cleanupClass(name: string) {
  const classItem = await prisma.class.findFirst({ where: { name } })
  if (!classItem) return
  await prisma.booking.deleteMany({ where: { classId: classItem.id } })
  await prisma.class.delete({ where: { id: classItem.id } })
}

export async function getLatestPayment(email: string) {
  const user = await findUser(email)
  return prisma.payment.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function snapshot() {
  const [users, memberships, workouts, bookings, notifications, payments] = await Promise.all([
    prisma.user.count(),
    prisma.membership.count(),
    prisma.workoutLog.count(),
    prisma.booking.count(),
    prisma.notification.count(),
    prisma.payment.count(),
  ])

  return { users, memberships, workouts, bookings, notifications, payments }
}

export async function closeDb() {
  await prisma.$disconnect()
}
