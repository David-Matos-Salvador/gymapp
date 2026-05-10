import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const plans = await prisma.routinePlan.findMany({
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ plans })
}
