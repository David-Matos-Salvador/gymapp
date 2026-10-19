import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener una mayuscula")
    .regex(/[0-9]/, "Debe contener un numero"),
  role: z.literal("MEMBER").default("MEMBER"),
  gymSlug: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, gymSlug } = parsed.data

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "El email ya esta registrado" }, { status: 409 })
    }

    let gym: { id: string; active: boolean } | null = null
    if (gymSlug) {
      gym = await prisma.gym.findUnique({
        where: { slug: gymSlug },
        select: { id: true, active: true },
      })
      if (!gym || !gym.active) {
        return NextResponse.json(
          { error: "El gimnasio no existe o no está disponible" },
          { status: 400 }
        )
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: "MEMBER",
        gymId: gym?.id ?? undefined,
      },
    })

    return NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
