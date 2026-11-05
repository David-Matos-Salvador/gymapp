import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ token: string }>
}

const completeSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener una mayúscula")
    .regex(/[0-9]/, "Debe contener un número"),
  phone: z.string().optional(),
})

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params

  const invite = await prisma.trainerInvite.findUnique({
    where: { token },
    include: {
      trainer: { select: { name: true } },
      gym: { select: { name: true } },
    },
  })

  if (!invite) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 })
  }

  if (invite.status === "COMPLETED") {
    return NextResponse.json({ error: "Esta invitación ya fue usada" }, { status: 410 })
  }

  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    if (invite.status === "PENDING") {
      await prisma.trainerInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      })
    }
    return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 410 })
  }

  return NextResponse.json({
    invite: {
      trainerName: invite.trainer?.name ?? null,
      gymName: invite.gym?.name ?? null,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      expiresAt: invite.expiresAt.toISOString(),
    },
  })
}

export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params

  const invite = await prisma.trainerInvite.findUnique({
    where: { token },
  })

  if (!invite) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 })
  }

  if (invite.status === "COMPLETED") {
    return NextResponse.json({ error: "Esta invitación ya fue usada" }, { status: 410 })
  }

  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    if (invite.status === "PENDING") {
      await prisma.trainerInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      })
    }
    return NextResponse.json({ error: "Esta invitación ha expirado" }, { status: 410 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = completeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, email, password, phone } = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: "El email ya esta registrado" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      phone: phone?.trim() || invite.phone,
      role: "MEMBER",
      assignedTrainerId: invite.trainerId,
      gymId: invite.gymId,
    },
  })

  await prisma.trainerInvite.update({
    where: { id: invite.id },
    data: {
      status: "COMPLETED",
      usedByUserId: user.id,
      completedAt: new Date(),
    },
  })

  return NextResponse.json(
    { message: "Cuenta creada", user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 }
  )
}
