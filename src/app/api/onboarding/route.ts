import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTrainerClientIds } from "@/lib/trainer-client"
import { NextResponse } from "next/server"

const userSelect = {
  id: true,
  name: true,
  gymId: true,
  onboardingCompleted: true,
  onboardingCompletedAt: true,
  trainingFrequency: true,
}

async function resolveUser(sessionEmail: string, memberId: string | null) {
  const caller = await prisma.user.findUnique({
    where: { email: sessionEmail },
    select: { id: true, role: true, gymId: true },
  })
  if (!caller) return { error: "Usuario no encontrado", status: 404 } as const

  if (memberId) {
    if (caller.role !== "TRAINER" && caller.role !== "ADMIN") {
      return {
        error: "Solo entrenadores pueden completar el onboarding de un miembro",
        status: 403,
      } as const
    }
    if (caller.role === "TRAINER") {
      const clientIds = await getTrainerClientIds(caller.id)
      if (!clientIds.includes(memberId)) {
        return { error: "El miembro no es tu cliente", status: 403 } as const
      }
    }
    const target = await prisma.user.findUnique({
      where: { id: memberId },
      select: { ...userSelect, gymId: true },
    })
    if (!target) return { error: "Miembro no encontrado", status: 404 } as const
    if (caller.role === "ADMIN" && (!caller.gymId || target.gymId !== caller.gymId)) {
      return { error: "Miembro no encontrado", status: 404 } as const
    }
    return { user: target, assisted: true } as const
  }

  if (caller.role !== "MEMBER") {
    return { error: "Solo los miembros pueden completar el onboarding", status: 403 } as const
  }
  const target = await prisma.user.findUnique({ where: { id: caller.id }, select: userSelect })
  if (!target) return { error: "Usuario no encontrado", status: 404 } as const
  return { user: target, assisted: false } as const
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const memberId = new URL(request.url).searchParams.get("memberId")
  const resolved = await resolveUser(session.user.email, memberId)
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const user = resolved.user

  const assignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true },
    select: { id: true },
  })

  // Rutina asignada por el coach (el plan no pertenece al miembro)
  const coachAssignment = await prisma.assignedRoutinePlan.findFirst({
    where: { userId: user.id, active: true, plan: { userId: { not: user.id } } },
    include: {
      plan: {
        include: {
          user: { select: { name: true } },
          splits: {
            orderBy: { order: "asc" },
            include: {
              exercises: {
                orderBy: { order: "asc" },
                select: {
                  sets: true,
                  reps: true,
                  weight: true,
                  restSeconds: true,
                  exercise: {
                    select: { id: true, name: true, muscleGroup: true, equipment: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const coachPlan = coachAssignment
    ? {
        id: coachAssignment.plan.id,
        name: coachAssignment.plan.name,
        description: coachAssignment.plan.description,
        coachName: coachAssignment.plan.user?.name ?? null,
        splits: coachAssignment.plan.splits.map((s) => ({
          id: s.id,
          label: s.label,
          name: s.name,
          muscleGroups: s.muscleGroups,
          estimatedDuration: s.estimatedDuration,
          exercises: s.exercises.map((e) => ({
            id: e.exercise.id,
            name: e.exercise.name,
            muscleGroup: e.exercise.muscleGroup,
            equipment: e.exercise.equipment,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            restSeconds: e.restSeconds,
          })),
        })),
      }
    : null

  return NextResponse.json({
    onboardingCompleted: user.onboardingCompleted,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    gymId: user.gymId,
    gymName: user.gymId
      ? ((await prisma.gym.findUnique({ where: { id: user.gymId }, select: { name: true } }))
          ?.name ?? null)
      : null,
    hasRoutine: !!assignment,
    trainingFrequency: user.trainingFrequency ?? null,
    coachPlan,
    assisted: resolved.assisted,
    memberName: resolved.assisted ? user.name : null,
  })
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const {
      objective,
      experienceLevel,
      trainingFrequency,
      weight,
      height,
      measurements,
      memberId,
    } = body

    const resolved = await resolveUser(
      session.user.email,
      typeof memberId === "string" ? memberId : null
    )
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }

    const target = resolved.user

    const bmi =
      typeof weight === "number" && typeof height === "number"
        ? weight / ((height / 100) * (height / 100))
        : null

    const onboardingBody = { ...body }
    delete onboardingBody.memberId

    await prisma.user.update({
      where: { id: target.id },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        onboardingData: {
          ...onboardingBody,
          bmi: bmi ? Math.round(bmi * 10) / 10 : null,
          completedAt: new Date().toISOString(),
        },
        objective: objective === "UNSURE" ? null : (objective as never),
        experienceLevel: experienceLevel as never,
        trainingFrequency: trainingFrequency as number,
        height: typeof height === "number" ? height : null,
        weight: typeof weight === "number" ? weight : null,
      },
    })

    // Primera medición corporal: se crea una sola vez (si el miembro aún no tiene ninguna)
    const measurementCount = await prisma.bodyMeasurement.count({ where: { userId: target.id } })
    if (measurementCount === 0) {
      const m = (measurements ?? {}) as Record<string, unknown>
      const num = (v: unknown) => (typeof v === "number" && v > 0 ? v : null)
      const w = typeof weight === "number" ? weight : null
      const h = typeof height === "number" ? height : null
      const notes = typeof m.notes === "string" && m.notes.trim() ? m.notes.trim() : null
      const hasAny = [
        num(m.bodyFat),
        num(m.muscleMass),
        num(m.neck),
        num(m.shoulders),
        num(m.chest),
        num(m.waist),
        num(m.hips),
        num(m.leftArm),
        num(m.rightArm),
        num(m.leftForearm),
        num(m.rightForearm),
        num(m.leftThigh),
        num(m.rightThigh),
        num(m.leftCalf),
        num(m.rightCalf),
      ].some((v) => v !== null)

      if (w !== null || h !== null || hasAny || notes) {
        await prisma.bodyMeasurement.create({
          data: {
            userId: target.id,
            date: new Date(),
            weight: w,
            height: h,
            bmi: bmi ? Math.round(bmi * 10) / 10 : null,
            bodyFat: num(m.bodyFat),
            muscleMass: num(m.muscleMass),
            neck: num(m.neck),
            shoulders: num(m.shoulders),
            chest: num(m.chest),
            waist: num(m.waist),
            hips: num(m.hips),
            leftArm: num(m.leftArm),
            rightArm: num(m.rightArm),
            leftForearm: num(m.leftForearm),
            rightForearm: num(m.rightForearm),
            leftThigh: num(m.leftThigh),
            rightThigh: num(m.rightThigh),
            leftCalf: num(m.leftCalf),
            rightCalf: num(m.rightCalf),
            notes,
          },
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Onboarding completado",
        bmi: bmi ? Math.round(bmi * 10) / 10 : null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[onboarding] POST error:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
