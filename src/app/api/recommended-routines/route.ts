import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const routines = await prisma.routine.findMany({
    where: { assignedToId: null },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ routines })
}
