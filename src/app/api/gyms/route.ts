import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSuperAdmin } from "@/lib/authz"

const createGymSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional(),
  showMachineNumbers: z.boolean().optional(),
})

export async function GET() {
  const gyms = await prisma.gym.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      logoUrl: true,
      showMachineNumbers: true,
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ gyms })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })
  if (!user || !isSuperAdmin(user.role)) {
    return NextResponse.json({ error: "Solo el superadmin puede crear gimnasios" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createGymSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, address, phone, email, logoUrl, showMachineNumbers } = parsed.data
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50)

  if (!slug) {
    return NextResponse.json(
      { error: "El nombre del gimnasio no genera un slug válido" },
      { status: 400 }
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const gym = await tx.gym.create({
        data: {
          name,
          slug,
          address,
          phone,
          email,
          logoUrl,
          showMachineNumbers,
          ownerId: null,
        },
      })

      const exercises = await tx.exercise.findMany({ select: { id: true } })
      if (exercises.length > 0) {
        await tx.gymExercise.createMany({
          data: exercises.map((exercise) => ({
            gymId: gym.id,
            exerciseId: exercise.id,
            active: true,
          })),
          skipDuplicates: true,
        })
      }

      const systemEquipment = await tx.gymEquipment.findMany({
        where: { isSystem: true },
        select: { id: true },
      })
      if (systemEquipment.length > 0) {
        await tx.gymEquipmentActivation.createMany({
          data: systemEquipment.map((equipment) => ({
            gymId: gym.id,
            equipmentId: equipment.id,
            active: true,
          })),
          skipDuplicates: true,
        })
      }

      return {
        gym,
        provisionedExercises: exercises.length,
        provisionedEquipment: systemEquipment.length,
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un gimnasio con ese nombre", details: { name: ["Slug duplicado"] } },
        { status: 409 }
      )
    }
    console.error("POST /api/gyms:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
