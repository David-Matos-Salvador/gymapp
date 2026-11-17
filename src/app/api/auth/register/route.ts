import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimit, requestIp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { getRequestId } from "@/lib/request-id"

const registerSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener una mayúscula")
    .regex(/[0-9]/, "Debe contener un número"),
  role: z.literal("MEMBER").default("MEMBER"),
  gymSlug: z.string().optional(),
})

export async function POST(request: Request) {
  const requestId = getRequestId(request)

  try {
    if (!(await rateLimit(`register:${requestIp(request)}`, 5, 900))) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, gymSlug } = parsed.data

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 })
    }

    let gym: { id: string; active: boolean; isDefault: boolean } | null = null
    if (gymSlug) {
      gym = await prisma.gym.findUnique({
        where: { slug: gymSlug },
        select: { id: true, active: true, isDefault: true },
      })
      if (!gym || !gym.active || gym.isDefault) {
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
    logger.error("Register failed", {
      requestId,
      context: { route: "POST /api/auth/register" },
      error,
    })
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
