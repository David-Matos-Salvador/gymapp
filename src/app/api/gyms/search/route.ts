import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim()
  if (q.length < 2) {
    return NextResponse.json({ gyms: [] })
  }

  const gyms = await prisma.gym.findMany({
    where: {
      active: true,
      isDefault: false,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, slug: true, address: true },
    orderBy: { name: "asc" },
    take: 10,
  })

  return NextResponse.json({ gyms })
}
