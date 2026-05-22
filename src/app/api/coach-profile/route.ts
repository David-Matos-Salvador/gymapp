import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const updateCoachProfileSchema = z.object({
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  yearsExperience: z.number().int().min(0).optional(),
})

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
      role: true,
      bio: true,
      specialties: true,
      certifications: true,
      yearsExperience: true,
      image: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ coachProfile: user })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.role !== "TRAINER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo entrenadores pueden actualizar su perfil profesional" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateCoachProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      bio: parsed.data.bio ?? user.bio,
      specialties: (parsed.data.specialties ?? user.specialties) as any,
      certifications: (parsed.data.certifications ?? user.certifications) as any,
      yearsExperience: parsed.data.yearsExperience ?? user.yearsExperience,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      specialties: true,
      certifications: true,
      yearsExperience: true,
      image: true,
    },
  })

  return NextResponse.json({ coachProfile: updated })
}
