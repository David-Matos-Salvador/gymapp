import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Real-database integration coverage for the booking race.
 *
 * Run explicitly (it needs a seeded PostgreSQL database):
 *   BOOKINGS_INTEGRATION=1 DATABASE_URL=... npx vitest run \
 *     src/__tests__/api/bookings.integration.test.ts
 *
 * It is skipped during `npm run validate` so the default suite stays DB-free.
 */

const RUN_INTEGRATION = process.env.BOOKINGS_INTEGRATION === "1"

const authState = vi.hoisted(() => ({ emails: [] as string[] }))

vi.mock("@/lib/auth", () => ({
  auth: async () => {
    const email = authState.emails.shift()
    return email ? { user: { email } } : null
  },
}))

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json", ...init?.headers },
      })
      Object.defineProperty(response, "json", {
        value: async () => body,
      })
      return response
    }),
  },
}))

function readDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), "utf8")
      const line = content
        .split(/\r?\n/)
        .map((item) => item.trim())
        .find((item) => item.startsWith("DATABASE_URL="))
      if (line)
        return line
          .slice("DATABASE_URL=".length)
          .trim()
          .replace(/^["']|["']$/g, "")
    } catch {
      // Try the next file.
    }
  }

  throw new Error("DATABASE_URL no está definida")
}

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
const EMAIL_PREFIX = `booking-race-${RUN_ID}`
const CLASS_PREFIX = `Clase Race ${RUN_ID}`

let prisma: PrismaClient
let postBooking: (request: Request) => Promise<Response>
let deleteBooking: (request: Request) => Promise<Response>
let trainerId: string
let planId: string
const userIds: string[] = []

async function createMember(suffix: string, paymentConfirmed = true, daysToExpire = 30) {
  const email = `${EMAIL_PREFIX}-${suffix}@gymapp.com`
  const user = await prisma.user.create({
    data: { email, name: `Race ${suffix}`, role: "MEMBER" },
  })
  await prisma.membership.create({
    data: {
      userId: user.id,
      planId,
      status: "ACTIVE",
      endDate: new Date(Date.now() + daysToExpire * 86_400_000),
      paymentConfirmed,
    },
  })
  userIds.push(user.id)
  return { id: user.id, email }
}

async function createClass(name: string, capacity: number) {
  return prisma.class.create({
    data: {
      name,
      trainerId,
      capacity,
      duration: 30,
      dayOfWeek: "FRIDAY",
      startTime: "20:00",
    },
  })
}

async function book(emails: string[], classId: string) {
  authState.emails.push(...emails)
  return Promise.all(
    emails.map(() =>
      postBooking(
        new Request("http://localhost:3113/api/bookings", {
          method: "POST",
          body: JSON.stringify({ classId }),
          headers: { "Content-Type": "application/json" },
        })
      )
    )
  )
}

async function confirmedCount(classId: string) {
  return prisma.booking.count({ where: { classId, status: "CONFIRMED" } })
}

describe.skipIf(!RUN_INTEGRATION)("booking capacity under concurrency (real DB)", () => {
  beforeAll(async () => {
    const connectionString = readDatabaseUrl()
    process.env.DATABASE_URL = connectionString

    const adapter = new PrismaPg({ connectionString })
    prisma = new PrismaClient({ adapter })

    const trainer = await prisma.user.findUnique({ where: { email: "trainer@gymapp.com" } })
    const plan = await prisma.membershipPlan.findFirst()
    if (!trainer) throw new Error("Falta el trainer del seed")
    if (!plan) throw new Error("Falta un plan de membresía del seed")
    trainerId = trainer.id
    planId = plan.id

    const route = await import("@/app/api/bookings/route")
    postBooking = route.POST
    deleteBooking = route.DELETE
  })

  afterAll(async () => {
    if (!prisma) return
    // Deleting a class cascades its bookings.
    await prisma.class.deleteMany({ where: { name: { startsWith: CLASS_PREFIX } } })
    await prisma.membership.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  it("capacity 1 with two concurrent users yields [201, 409] and one CONFIRMED", async () => {
    const cls = await createClass(`${CLASS_PREFIX} c1`, 1)
    const a = await createMember("c1-a")
    const b = await createMember("c1-b")

    const responses = await book([a.email, b.email], cls.id)
    const statuses = responses.map((response) => response.status).sort((x, y) => x - y)

    expect(statuses).toEqual([201, 409])
    expect(await confirmedCount(cls.id)).toBe(1)
  })

  it("capacity 2 with three concurrent users yields [201, 201, 409]", async () => {
    const cls = await createClass(`${CLASS_PREFIX} c2`, 2)
    const users = await Promise.all([
      createMember("c2-a"),
      createMember("c2-b"),
      createMember("c2-c"),
    ])

    const responses = await book(
      users.map((user) => user.email),
      cls.id
    )
    const statuses = responses.map((response) => response.status).sort((x, y) => x - y)

    expect(statuses).toEqual([201, 201, 409])
    expect(await confirmedCount(cls.id)).toBe(2)
  })

  it("lets the same user cancel and re-book without P2002 or 500", async () => {
    const cls = await createClass(`${CLASS_PREFIX} rebook`, 1)
    const user = await createMember("rebook")

    const [first] = await book([user.email], cls.id)
    expect(first.status).toBe(201)
    const firstBody = (await first.json()) as { booking: { id: string } }

    authState.emails.push(user.email)
    const cancelled = await deleteBooking(
      new Request("http://localhost:3113/api/bookings", {
        method: "DELETE",
        body: JSON.stringify({ bookingId: firstBody.booking.id }),
        headers: { "Content-Type": "application/json" },
      })
    )
    expect(cancelled.status).toBe(200)

    const [second] = await book([user.email], cls.id)
    expect(second.status).toBe(201)
    expect(await confirmedCount(cls.id)).toBe(1)

    const rows = await prisma.booking.findMany({ where: { classId: cls.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe("CONFIRMED")
  })

  it("rejects a member whose membership is not payment-confirmed", async () => {
    const cls = await createClass(`${CLASS_PREFIX} unpaid`, 1)
    const user = await createMember("unpaid", false)

    const [response] = await book([user.email], cls.id)

    expect(response.status).toBe(403)
    expect(await confirmedCount(cls.id)).toBe(0)
  })

  it("rejects a member whose membership has expired", async () => {
    const cls = await createClass(`${CLASS_PREFIX} expired`, 1)
    const user = await createMember("expired", true, -1)

    const [response] = await book([user.email], cls.id)

    expect(response.status).toBe(403)
    expect(await confirmedCount(cls.id)).toBe(0)
  })

  it("20 concurrent users never exceed capacity and never return 5xx", async () => {
    const capacity = 5
    const cls = await createClass(`${CLASS_PREFIX} c20`, capacity)
    const users = await Promise.all(
      Array.from({ length: 20 }, (_, index) => createMember(`c20-${index}`))
    )

    const responses = await book(
      users.map((user) => user.email),
      cls.id
    )
    const statuses = responses.map((response) => response.status)

    expect(statuses.filter((status) => status === 201)).toHaveLength(capacity)
    expect(statuses.filter((status) => status === 409)).toHaveLength(20 - capacity)
    expect(statuses.filter((status) => status >= 500)).toEqual([])
    expect(await confirmedCount(cls.id)).toBe(capacity)
  })
})
