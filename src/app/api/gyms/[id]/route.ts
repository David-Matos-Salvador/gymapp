import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canEditGymField, isSuperAdmin } from "@/lib/authz"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateGymSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional(),
  active: z.boolean().optional(),
  showMachineNumbers: z.boolean().optional(),
})

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const gym = await prisma.gym.findUnique({ where: { id } })
    if (!gym) {
      return NextResponse.json({ error: "Gimnasio no encontrado" }, { status: 404 })
    }
    return NextResponse.json({ gym })
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, gymId: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { id } = await params
    const existing = await prisma.gym.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Gimnasio no encontrado" }, { status: 404 })
    }

    if (!isSuperAdmin(user.role) && user.gymId !== id) {
      return NextResponse.json({ error: "Sin permisos sobre este gimnasio" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateGymSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const fields = Object.keys(parsed.data)
    if (fields.length === 0) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 })
    }

    const forbidden = fields.filter((field) => !canEditGymField(user.role, field))
    if (forbidden.length > 0) {
      return NextResponse.json(
        {
          error: "No puedes modificar esos campos de este gimnasio",
          details: { forbidden },
        },
        { status: 403 }
      )
    }

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.name) {
      data.slug = parsed.data.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 50)
    }

    const gym = await prisma.gym.update({ where: { id }, data })
    return NextResponse.json({ gym })
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
    console.error("PATCH /api/gyms/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
