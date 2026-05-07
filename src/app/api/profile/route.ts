import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const body = await request.json()
  const { name, phone } = body

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name ?? user.name,
      phone: phone ?? user.phone,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      membershipStatus: true,
      image: true,
      createdAt: true,
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
      membershipStatus: true,
      image: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ user })
}
