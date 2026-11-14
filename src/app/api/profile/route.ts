import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isValidPhone, PHONE_ERROR } from "@/lib/phone"
import { isValidBirthDate, BIRTH_DATE_ERROR } from "@/lib/birth-date"

// Sin enviar (o null en el nombre y en las listas) = no cambiar. Teléfonos, fecha de nacimiento
// y contacto de emergencia vacíos o null = borrarlos.
const EMERGENCY_PHONE_ERROR =
  "Escribe un teléfono de emergencia válido, por ejemplo +51 999 123 456"

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
    sex: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Elige un sexo de la lista" }).nullish(),
    birthDate: z
      .string({ error: BIRTH_DATE_ERROR })
      .trim()
      .refine((value) => value === "" || isValidBirthDate(value), BIRTH_DATE_ERROR)
      .nullish(),
    objective: z
      .enum(
        [
          "WEIGHT_LOSS",
          "MUSCLE_GAIN",
          "TONING",
          "STRENGTH",
          "ENDURANCE",
          "GENERAL_FITNESS",
          "REHABILITATION",
          "COMPETITION",
        ],
        { error: "Elige un objetivo de la lista" }
      )
      .nullish(),
    experienceLevel: z
      .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"], {
        error: "Elige un nivel de experiencia de la lista",
      })
      .nullish(),
    emergencyContact: z
      .string({ error: "El contacto de emergencia no es válido" })
      .trim()
      .max(100, "El contacto de emergencia no puede tener más de 100 caracteres")
      .nullish(),
    emergencyPhone: z
      .string({ error: EMERGENCY_PHONE_ERROR })
      .trim()
      .refine((value) => value === "" || isValidPhone(value), EMERGENCY_PHONE_ERROR)
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
  const {
    name,
    phone,
    sex,
    birthDate,
    objective,
    experienceLevel,
    emergencyContact,
    emergencyPhone,
  } = parsed.data

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name ?? user.name,
      phone: phone === undefined ? user.phone : phone || null,
      sex: sex ?? undefined,
      birthDate:
        birthDate === undefined
          ? undefined
          : birthDate
            ? new Date(`${birthDate}T00:00:00.000Z`)
            : null,
      objective: objective ?? undefined,
      experienceLevel: experienceLevel ?? undefined,
      emergencyContact: emergencyContact === undefined ? undefined : emergencyContact || null,
      emergencyPhone: emergencyPhone === undefined ? undefined : emergencyPhone || null,
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
