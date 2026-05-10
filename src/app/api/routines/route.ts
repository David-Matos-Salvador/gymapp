import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  if (user.role === "MEMBER") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const plans = await prisma.routinePlan.findMany({
    where: { userId: user.id },
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ plans })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== "ADMIN" && user.role !== "TRAINER")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, exercises } = body as {
    name: string
    description?: string
    exercises?: { exerciseId: string; sets: number; reps: string; weight: number; restSeconds: number; order: number }[]
  }

  if (!name) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  }

  const plan = await prisma.routinePlan.create({
    data: {
      name,
      description,
      userId: user.id,
      splits: {
        create: [{
          label: "A",
          name,
          muscleGroups: [],
          exercises: exercises
            ? {
                create: exercises.map((e) => ({
                  exerciseId: e.exerciseId,
                  sets: e.sets,
                  reps: String(e.reps),
                  weight: e.weight,
                  restSeconds: e.restSeconds,
                  order: e.order,
                })),
              }
            : undefined,
        }],
      },
    },
    include: {
      splits: {
        include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
      },
    },
  })

  return NextResponse.json({ plan }, { status: 201 })
}
