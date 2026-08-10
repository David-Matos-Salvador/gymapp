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
  role: z.enum(["MEMBER", "TRAINER", "ADMIN"]).default("MEMBER"),
  gymName: z.string().optional(),
  gymAddress: z.string().optional(),
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

    const { name, email, password, role, gymName, gymAddress } = parsed.data

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya esta registrado" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    let gymId: string | undefined

    if (role === "ADMIN" && gymName) {
      const slug = gymName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 50)

      const existingGym = await prisma.gym.findUnique({ where: { slug } })
      if (existingGym) {
        return NextResponse.json(
          { error: "Ya existe un gimnasio con ese nombre. Elige otro." },
          { status: 409 }
        )
      }

      const gym = await prisma.gym.create({
        data: {
          name: gymName,
          slug,
          address: gymAddress,
        },
      })
      gymId = gym.id
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role,
        gymId: gymId ?? undefined,
      },
    })

    if (gymId) {
      await prisma.gym.update({
        where: { id: gymId },
        data: { ownerId: user.id },
      })

      // Activate all system exercises for the new gym
      const allExercises = await prisma.exercise.findMany({ select: { id: true } })
      await prisma.gymExercise.createMany({
        data: allExercises.map((ex) => ({ gymId, exerciseId: ex.id, active: true })),
        skipDuplicates: true,
      })

      // Activate all system equipment for the new gym
      const systemEquipment = await prisma.gymEquipment.findMany({
        where: { isSystem: true },
        select: { id: true },
      })
      if (systemEquipment.length > 0) {
        await prisma.gymEquipmentActivation.createMany({
          data: systemEquipment.map((eq) => ({ gymId, equipmentId: eq.id, active: true })),
          skipDuplicates: true,
        })
      }
    }

    return NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
