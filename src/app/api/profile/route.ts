import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isValidPhone, PHONE_ERROR } from "@/lib/phone"

// Sin enviar (o null en el nombre) = no cambiar. Teléfono vacío o null = borrarlo.
const updateProfileSchema = z.object(
  {
    name: z
      .string({ error: "El nombre no es válido" })
      .trim()
      .min(1, "El nombre no puede estar vacío")
      .max(100, "El nombre no puede tener más de 100 caracteres")
      .nullish(),
    phone: z
      .string({ error: PHONE_ERROR })
      .trim()
      .refine((value) => value === "" || isValidPhone(value), PHONE_ERROR)
      .nullish(),
  },
  { error: "Datos inválidos" }
)

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    )
  }
  const { name, phone } = parsed.data

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name ?? user.name,
      phone: phone === undefined ? user.phone : phone || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      sex: true,
      birthDate: true,
      objective: true,
      experienceLevel: true,
      medicalNotes: true,
      emergencyContact: true,
      emergencyPhone: true,
      height: true,
      weight: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ user: updated })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      sex: true,
      birthDate: true,
      objective: true,
      experienceLevel: true,
      medicalNotes: true,
      emergencyContact: true,
      emergencyPhone: true,
      height: true,
      weight: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ user })
}
