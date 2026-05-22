/*
 * Prisma client singleton with @prisma/adapter-pg driver adapter.
 *
 * adapter-pg connects Prisma directly to PostgreSQL via the `pg` driver,
 * bypassing Prisma's built-in connection pool. This is required for Next.js
 * edge/serverless environments where traditional TCP connection pools
 * don't work well. It also enables Prisma Accelerate-compatible deployments.
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })

  return new PrismaClient({
    adapter,
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
