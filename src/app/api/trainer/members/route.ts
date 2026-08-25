import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createMemberSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener una mayuscula")
    .regex(/[0-9]/, "Debe contener un numero"),
  phone: z.string().optional(),
})

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
  const parsed = createMemberSchema.safeParse(body)

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

  const member = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      phone: phone?.trim() || null,
      role: "MEMBER",
      assignedTrainerId: user.id,
      gymId: user.gymId,
    },
  })

  return NextResponse.json(
    { message: "Miembro creado", user: { id: member.id, email: member.email, name: member.name } },
    { status: 201 }
  )
}
