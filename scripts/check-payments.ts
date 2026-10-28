/**
 * Regla de pagos: una membresía marcada como pagada (`paymentConfirmed`) de un plan con precio
 * debe tener al menos un Payment COMPLETED. La tabla Payment es el registro de los pagos y de ahí
 * salen los ingresos del dashboard; si no coinciden, la app muestra "Pagado" sin ingresos.
 *
 * Uso: `npm run db:check:payments` (sale con código 1 si encuentra membresías incoherentes).
 */
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const incoherent = await prisma.membership.findMany({
    where: {
      paymentConfirmed: true,
      plan: { price: { gt: 0 } },
      payments: { none: { status: "COMPLETED" } },
    },
    select: { id: true, user: { select: { email: true } }, plan: { select: { name: true } } },
  })

  if (incoherent.length === 0) {
    console.log("✅ Pagos coherentes: toda membresía pagada tiene su pago registrado")
    return
  }

  console.error(`❌ ${incoherent.length} membresías marcadas como pagadas sin un pago COMPLETED:`)
  for (const m of incoherent) console.error(`   - ${m.id} (${m.plan.name})`)
  process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
