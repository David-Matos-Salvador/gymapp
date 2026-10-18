import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

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
      // next
    }
  }
  throw new Error("DATABASE_URL no está definida")
}

const apply = process.argv.includes("--apply")
const adapter = new PrismaPg({ connectionString: readDatabaseUrl() })
const prisma = new PrismaClient({ adapter })

async function main() {
  const report = {
    apply,
    membershipSnapshots: { candidates: 0, updated: 0 },
    legacyPayments: { candidates: 0, linked: 0, ambiguous: [] as string[] },
  }

  const memberships = await prisma.membership.findMany({
    where: { planPrice: 0 },
    include: { plan: { select: { price: true, currency: true, durationDays: true } } },
  })
  report.membershipSnapshots.candidates = memberships.length
  if (apply) {
    for (const membership of memberships) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          planPrice: membership.plan.price,
          planCurrency: membership.plan.currency,
          planDurationDays: membership.plan.durationDays,
        },
      })
      report.membershipSnapshots.updated++
    }
  }

  const payments = await prisma.payment.findMany({
    where: { membershipId: null, type: "MEMBERSHIP" },
    select: { id: true, userId: true, amount: true, currency: true },
  })
  report.legacyPayments.candidates = payments.length

  for (const payment of payments) {
    const candidates = await prisma.membership.findMany({
      where: { userId: payment.userId, paymentConfirmed: false },
      include: { plan: { select: { price: true, currency: true } } },
    })
    const matches = candidates.filter(
      (membership) =>
        membership.plan.price === payment.amount && membership.plan.currency === payment.currency
    )
    if (matches.length !== 1) {
      report.legacyPayments.ambiguous.push(payment.id)
      continue
    }
    if (apply) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { membershipId: matches[0].id },
      })
    }
    report.legacyPayments.linked++
  }

  console.log(JSON.stringify(report, null, 2))
  if (!apply) console.log("Dry-run. Usá --apply para persistir.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
