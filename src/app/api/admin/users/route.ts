import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin } from "@/lib/authz"

const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Debe contener una mayúscula")
    .regex(/[0-9]/, "Debe contener un número"),
  role: z.enum(["ADMIN", "TRAINER"]),
  gymId: z.string().min(1),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const actor = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })
  if (!actor || !isSuperAdmin(actor.role)) {
    return NextResponse.json({ error: "Solo el superadmin puede crear admins" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createAdminSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 })
  }

  const gym = await prisma.gym.findUnique({
    where: { id: parsed.data.gymId },
    select: { id: true, active: true, name: true },
  })
  if (!gym || !gym.active) {
    return NextResponse.json({ error: "Gimnasio no disponible" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: passwordHash,
      role: parsed.data.role,
      gymId: gym.id,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    },
    select: { id: true, name: true, email: true, role: true, gymId: true },
  })

  return NextResponse.json({ user }, { status: 201 })
}
