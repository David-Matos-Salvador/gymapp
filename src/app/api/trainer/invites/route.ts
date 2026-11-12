import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildInviteUrl, publicOrigin } from "@/lib/public-url"

const INVITE_TTL_DAYS = 7

const createInviteSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email("Email inválido").max(200).optional(),
  phone: z.string().trim().min(6).max(30).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const invites = await prisma.trainerInvite.findMany({
    where: { trainerId: user.id },
    include: { usedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return NextResponse.json({ invites })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "TRAINER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = createInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { name, email, phone } = parsed.data

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
    }
  }

  const token = randomBytes(24).toString("hex")
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000)

  const invite = await prisma.trainerInvite.create({
    data: {
      token,
      trainerId: user.id,
      gymId: user.gymId,
      name: name?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      expiresAt,
    },
  })

  const url = buildInviteUrl(publicOrigin(request), invite.token)

  return NextResponse.json({ invite, url }, { status: 201 })
}
