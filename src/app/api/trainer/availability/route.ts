import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DAYS_OF_WEEK, validateAvailability } from "@/lib/coach-schedule"

const availabilitySchema = z.object({
  blocks: z
    .array(
      z.object({
        dayOfWeek: z.enum(DAYS_OF_WEEK),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .max(50),
})

async function getCoach() {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) }
  }
  if (!user.gymId) {
    return { error: NextResponse.json({ error: "Sin gimnasio asignado" }, { status: 403 }) }
  }
  return { user }
}

const BLOCK_SELECT = { dayOfWeek: true, startTime: true, endTime: true } as const

export async function GET() {
  const { user, error } = await getCoach()
  if (error) return error

  const blocks = await prisma.coachAvailability.findMany({
    where: { trainerId: user.id },
    select: BLOCK_SELECT,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })
  return NextResponse.json({ blocks })
}

/** Reemplaza toda la disponibilidad semanal del coach. Las sesiones ya reservadas no cambian. */
export async function PUT(request: Request) {
  const { user, error } = await getCoach()
  if (error) return error

  const body = await request.json().catch(() => null)
  const parsed = availabilitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
  const invalid = validateAvailability(parsed.data.blocks)
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 })
  }

  const blocks = await prisma.$transaction(async (tx) => {
    await tx.coachAvailability.deleteMany({ where: { trainerId: user.id } })
    if (parsed.data.blocks.length > 0) {
      await tx.coachAvailability.createMany({
        data: parsed.data.blocks.map((block) => ({ ...block, trainerId: user.id })),
      })
    }
    return tx.coachAvailability.findMany({
      where: { trainerId: user.id },
      select: BLOCK_SELECT,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })
  })

  return NextResponse.json({ blocks })
}
