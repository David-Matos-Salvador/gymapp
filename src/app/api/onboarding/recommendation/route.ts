import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { recommendRoutineWithAI } from "@/lib/ai-routine-recommendation"

const recommendationSchema = z.object({
  objective: z.enum(["WEIGHT_LOSS", "MUSCLE_GAIN", "GENERAL_FITNESS", "UNSURE"]),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ELITE"]),
  trainingFrequency: z.number().int().min(1).max(7),
  physicalConditions: z.array(z.string().max(40)).max(10).default([]),
  planIds: z.array(z.string().min(1).max(64)).min(2).max(8),
})

// Límite de uso por usuario: el onboarding se hace una vez, así que 5 al día sobra.
const DAILY_LIMIT = 5
const DAY_SECONDS = 24 * 60 * 60

/**
 * Recomendación de rutina con IA para el onboarding (#117). Nunca devuelve un error por
 * culpa de la IA: si no hay recomendación responde `{ recommendation: null }` y la
 * pantalla sigue con el orden normal de las rutinas (#86).
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }
  const parsed = recommendationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  // Solo para el onboarding propio del miembro.
  if (user.role !== "MEMBER") {
    return NextResponse.json({ recommendation: null })
  }

  const allowed = await rateLimit(`ai-recommendation:${user.id}`, DAILY_LIMIT, DAY_SECONDS)
  if (!allowed) {
    return NextResponse.json({ recommendation: null })
  }

  const { objective, experienceLevel, trainingFrequency, physicalConditions, planIds } = parsed.data

  // Solo plantillas del sistema: las mismas que el miembro puede elegir en el onboarding.
  const plans = await prisma.routinePlan.findMany({
    where: { id: { in: planIds }, user: { role: "SUPER_ADMIN" } },
    select: {
      id: true,
      name: true,
      difficulty: true,
      splits: { select: { name: true, muscleGroups: true }, orderBy: { order: "asc" } },
    },
  })
  // Mismo orden en que se muestran en pantalla.
  const options = planIds
    .map((id) => plans.find((plan) => plan.id === id))
    .filter((plan) => plan !== undefined)

  const recommendation = await recommendRoutineWithAI(
    {
      objective,
      experienceLevel,
      trainingFrequency,
      hasInjury: physicalConditions.includes("Lesión"),
    },
    options
  )

  return NextResponse.json({ recommendation })
}
